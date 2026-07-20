import io
import os
import polars as pl
import pandas as pd
import json
import pdfplumber
import re
from typing import List, Dict, Any, Tuple
from google.genai import types

def is_empty_value(val) -> bool:
    if val is None:
        return True
    val_str = str(val).strip().lower()
    if val_str in ["", "nan", "none", "null", "undefined"]:
        return True
    try:
        import math
        if isinstance(val, float) and math.isnan(val):
            return True
    except Exception:
        pass
    return False

def parse_file(file_bytes: bytes, filename: str, client = None) -> Tuple[List[str], List[Dict[str, Any]], int, str, str]:
    """
    Parses document bytes into (headers, rows, row_count, file_type, rag_text).
    """
    ext = filename.split(".")[-1].lower() if "." in filename else "txt"
    
    if ext == "csv":
        try:
            df = pl.read_csv(io.BytesIO(file_bytes), ignore_errors=True)
            rows = df.to_dicts()
            headers = df.columns
            return headers, rows, len(rows), "csv", ""
        except Exception as e:
            df = pd.read_csv(io.BytesIO(file_bytes), on_bad_lines='skip')
            headers = [str(c) for c in df.columns]
            rows = df.where(pd.notna(df), None).to_dict(orient="records")
            return headers, rows, len(rows), "csv", ""
        
    elif ext in ["xlsx", "xls"]:
        try:
            df_raw = pd.read_excel(io.BytesIO(file_bytes), header=None)
            grid = df_raw.where(pd.notna(df_raw), None).values.tolist()
            headers, rows, r_count, f_type, r_text = parse_grid_data(grid, filename, client)
            return headers, rows, r_count, ext, r_text
        except Exception as e:
            print(f"[Excel Ingest AI] Failed dynamic excel parsing: {e}. Falling back to default.")
            df = pd.read_excel(io.BytesIO(file_bytes))
            headers = [str(c) for c in df.columns]
            rows = df.where(pd.notna(df), None).to_dict(orient="records")
            return headers, rows, len(rows), ext, ""

        
    elif ext == "pdf":
        return parse_pdf_table(file_bytes, client)
        
    elif ext in ["png", "jpg", "jpeg", "gif", "bmp", "tiff", "webp", "svg"]:
        raise ValueError(
            f"Cannot read '{filename}' — this system does not support image input. "
            "Please upload a spreadsheet (.xlsx, .csv), PDF, or text file."
        )
        
    else:
        text = file_bytes.decode("utf-8", errors="ignore")
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        headers = ["Text"]
        rows = [{"Text": line} for line in lines]
        return headers, rows, len(rows), "txt", text

def parse_pdf_table(file_bytes: bytes, client = None) -> Tuple[List[str], List[Dict[str, Any]], int, str, str]:
    """
    Extracts every table from PDF. Uses Gemini Multimodal API if client is available.
    Otherwise fallbacks to pdfplumber table extraction & schema merging.
    """
    import re
    headers: List[str] = []
    rows: List[Dict[str, Any]] = []
    full_text = ""
    unstructured_text = ""
    
    # Extract full text from PDF for fallback & metadata
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            full_text = "\n".join(pages_text)
    except Exception as e:
        print(f"[PDF Ingestion] Failed to extract plain text: {e}")
        
    # 1. Gemini PDF parsing — disable by default, set PDF_USE_GEMINI=true to enable
    _use_gemini_pdf = os.environ.get("PDF_USE_GEMINI", "false").lower() == "true"
    if _use_gemini_pdf and client:
        _pdf_gemini_models = os.environ.get("PDF_GEMINI_MODELS", "gemini-2.5-flash,gemini-2.0-flash").split(",")
        for _gemini_model in _pdf_gemini_models:
            try:
                print(f"[PDF Ingestion] Trying {_gemini_model}...", flush=True)
                prompt = """
You are a precise document extraction agent. Analyze the provided PDF document.

This document may contain multiple separate tables on different pages.
Do NOT merge tables with different schemas or aggregation levels.
If multiple tables exist, select the most detailed/granular one.
Ignore summary or aggregated tables.

If column headers are in a non-English language, map them to clean English names.

Return ONLY a JSON response matching this schema:
{
  "headers": ["col1", "col2", ...],
  "rows": [
    {"col1": "val1", "col2": "val2", ...},
    ...
  ],
  "unstructuredText": "Any non-tabular text from the document"
}
"""
                res = client.models.generate_content(
                    model=_gemini_model,
                    contents=[
                        types.Part.from_bytes(data=file_bytes, mime_type="application/pdf"),
                        prompt
                    ],
                    config={"response_mime_type": "application/json"}
                )
                parsed = json.loads(res.text.strip())
                if isinstance(parsed, list) and len(parsed) > 0:
                    parsed = parsed[0]
                elif isinstance(parsed, dict) and "data" in parsed and isinstance(parsed["data"], list):
                    parsed = parsed["data"][0] if len(parsed["data"]) > 0 else {}
                    
                headers = parsed.get("headers", [])
                rows = parsed.get("rows", [])
                unstructured_text = parsed.get("unstructuredText", "")
                
                if rows:
                    print(f"[PDF Extract AI] {_gemini_model} extracted {len(rows)} rows.")
                    return headers, rows, len(rows), "pdf", unstructured_text
            except Exception as e:
                err_str = str(e).lower()
                if "not support" in err_str or "unsupported" in err_str or "not found" in err_str:
                    print(f"[PDF Ingestion] {_gemini_model} cannot process PDF, trying next model...")
                else:
                    print(f"[PDF Ingestion] {_gemini_model} failed: {e}. Trying next...")

    # 2. Fallback: pdfplumber table extraction & schema merging
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            all_extracted_tables = []
            for page in pdf.pages:
                tables = page.extract_tables()
                if tables:
                    all_extracted_tables.extend(tables)
            
            if all_extracted_tables:
                # Group tables by column count and column names (header similarity)
                table_groups = []
                for table in all_extracted_tables:
                    if len(table) < 2:
                        continue
                    current_headers = [str(h).strip() if h is not None else "" for h in table[0]]
                    current_headers = [h if h else f"Col_{i}" for i, h in enumerate(current_headers)]
                    data_rows = table[1:]
                    
                    # Look for matching table group
                    matched = False
                    for group_headers, group_rows in table_groups:
                        if len(group_headers) == len(current_headers):
                            matches = sum(1 for a, b in zip(group_headers, current_headers) if a.lower() == b.lower())
                            if matches / len(group_headers) >= 0.6:
                                group_rows.extend(data_rows)
                                matched = True
                                break
                    if not matched:
                        table_groups.append((current_headers, data_rows))
                
                # Select the most granular table group.
                # Score by row count + presence of temporal columns (indicating detailed records).
                if table_groups:
                    def score_group(g):
                        g_headers, g_rows = g
                        g_score = len(g_rows)
                        g_headers_lower = [str(h).lower() for h in g_headers]
                        if any(any(x in h for x in ["date", "time", "timestamp"]) for h in g_headers_lower):
                            g_score += 1000
                        if any(any(x in h for x in ["item", "qty", "quantity", "particulars", "remarks"]) for h in g_headers_lower):
                            g_score += 500
                        return g_score
                        
                    primary_group = max(table_groups, key=score_group)
                    headers = primary_group[0]
                    rows = []
                    for row_data in primary_group[1]:
                        if not any(row_data):
                            continue
                        row_dict = {}
                        for i, val in enumerate(row_data):
                            if i < len(headers):
                                val_cleaned = val.strip() if isinstance(val, str) else val
                                row_dict[headers[i]] = val_cleaned
                        rows.append(row_dict)
    except Exception as e:
        print(f"[PDF Extract Fallback] pdfplumber tables extraction failed: {e}")
        
    # Isolate unstructured text for RAG locally (if Gemini failed)
    if not unstructured_text:
        table_values = set()
        for row in rows:
            for val in row.values():
                if val:
                    table_values.add(str(val).strip().lower())
        
        clean_lines = []
        for line in full_text.split("\n"):
            line_clean = line.strip()
            if not line_clean:
                continue
            words = line_clean.lower().split()
            if words:
                matching_words = sum(1 for w in words if w in table_values)
                if matching_words / len(words) > 0.60:
                    continue  # skip lines that are mostly table values
            clean_lines.append(line_clean)
        unstructured_text = "\n".join(clean_lines)

    # Fallback to plain text if no table rows could be parsed
    if not rows and full_text.strip():
        lines = full_text.split("\n")
        headers = ["Text"]
        rows = [{"Text": l.strip()} for l in lines if l.strip()]
        unstructured_text = full_text
            
    return headers, rows, len(rows), "pdf", unstructured_text


def parse_grid_data(grid: List[List[Any]], filename: str, client = None) -> Tuple[List[str], List[Dict[str, Any]], int, str, str]:
    """
    Parses a 2D raw list of lists grid (from Excel or Google Sheets values) 
    using the Gemini layout solver and header-repair layers.
    """
    import json
    import pandas as pd
    
    # Diagnostic to check if it has standard layout
    is_standard = True
    if len(grid) > 0:
        first_row = grid[0]
        non_empty = [str(x).strip() for x in first_row if not is_empty_value(x)]
        
        # Heuristic 1: If first row has very few columns compared to the rest of the sheet, it's a title
        max_cols = max(len(r) for r in grid[:15]) if len(grid) > 0 else 0
        if len(non_empty) < max_cols * 0.7 or len(non_empty) <= 2:
            is_standard = False
        
        # Heuristic 2: If there are many empty cells or NaNs in first 5 rows, flag as complex
        df_top = pd.DataFrame(grid[:min(5, len(grid))])
        nan_ratio = df_top.isna().mean().mean()
        if nan_ratio > 0.15:
            is_standard = False
            
    if is_standard or not client or len(grid) == 0:
        if len(grid) == 0:
            return [], [], 0, "xlsx", ""
        raw_headers = ["" if is_empty_value(x) else str(x).strip() for x in grid[0]]
        raw_headers = [h if h else f"Col_{i}" for i, h in enumerate(raw_headers)]
        rows = []
        for row_data in grid[1:]:
            if not any(row_data):
                continue
            row_dict = {}
            for c_idx, h in enumerate(raw_headers):
                val = row_data[c_idx] if c_idx < len(row_data) else None
                if is_empty_value(val):
                    val = None
                else:
                    val = str(val).strip()
                row_dict[h] = val
            rows.append(row_dict)
        return raw_headers, rows, len(rows), "xlsx", ""
        
    try:
        print(f"[Excel Ingest AI] Complex spreadsheet format detected for {filename}. Prompting Gemini Flash layout solver...", flush=True)
        # Send sample grid (first 50 rows) to Gemini to identify start index and headers mapping
        grid_sample = []
        for row in grid[:50]:
            grid_sample.append([str(cell or "").strip() for cell in row])
            
        prompt = f"""
You are a spreadsheet analysis engine. Analyze this raw spreadsheet grid (list of lists). It may have empty/metadata rows at the top, merged header cells, or summary blocks/totals at the bottom.
Your task is to identify:
1. The 0-based index of the actual column header row.
2. The 0-based index of the first row of actual data.
3. The 0-based index of the last row of actual data (excluding summary cards or totals at the bottom).
4. A mapping of the original column headers (as strings) to clean, professional English names.

GRID SAMPLE (FIRST 50 ROWS):
{json.dumps(grid_sample, indent=2)}

Return ONLY a JSON response matching this schema (no markdown block formatting, no ``` json tags, no code blocks):
{{
  "headerRowIndex": 3,
  "dataStartRowIndex": 4,
  "dataEndRowIndex": 48,
  "headersMapping": {{"original_col_name": "Clean Name", ...}}
}}
"""
        from analytics.utils.llm_client import generate_content_safe
        res_text = generate_content_safe(client, prompt, json_mode=True)
        parsed_meta = json.loads(res_text)
        h_idx = int(parsed_meta.get("headerRowIndex", 0))
        start_idx = int(parsed_meta.get("dataStartRowIndex", h_idx + 1))
        end_idx = parsed_meta.get("dataEndRowIndex")
        headers_map = parsed_meta.get("headersMapping", {})
        
        # Extract headers and clean them
        raw_headers = ["" if is_empty_value(x) else str(x).strip() for x in grid[h_idx]]
        raw_headers = [h if h else f"Col_{i}" for i, h in enumerate(raw_headers)]
        cleaned_headers = [headers_map.get(h, h) for h in raw_headers]
        
        # Parse rows from start_idx to end_idx (ignore sample-constrained end_idx if grid is larger than sample)
        rows = []
        if len(grid) > 50:
            max_idx = len(grid) - 1
        else:
            max_idx = int(end_idx) if end_idx is not None else len(grid) - 1
            
        for idx in range(start_idx, min(max_idx + 1, len(grid))):
            row_data = grid[idx]
            if not any(row_data):
                continue
            row_dict = {}
            for c_idx, h in enumerate(cleaned_headers):
                val = row_data[c_idx] if c_idx < len(row_data) else None
                if is_empty_value(val):
                    val = None
                else:
                    val = str(val).strip()
                row_dict[h] = val
            rows.append(row_dict)
            
        return cleaned_headers, rows, len(rows), "xlsx", ""
    except Exception as e:
        print(f"[Excel Ingest AI] Failed dynamic excel parsing: {e}. Falling back to default.")
        # Default fallback
        raw_headers = ["" if is_empty_value(x) else str(x).strip() for x in grid[0]]
        raw_headers = [h if h else f"Col_{i}" for i, h in enumerate(raw_headers)]
        rows = []
        for row_data in grid[1:]:
            if not any(row_data):
                continue
            row_dict = {}
            for c_idx, h in enumerate(raw_headers):
                val = row_data[c_idx] if c_idx < len(row_data) else None
                if is_empty_value(val):
                    val = None
                else:
                    val = str(val).strip()
                row_dict[h] = val
            rows.append(row_dict)
        return raw_headers, rows, len(rows), "xlsx", ""
