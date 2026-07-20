import re
import json
from datetime import datetime
from typing import List, Dict, Any, Tuple

# Common date formats for parsing
DATE_FORMATS = [
    "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y", "%d/%m/%Y",
    "%Y/%m/%d", "%d %b %Y", "%d %B %Y", "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"
]

def clean_header(header: str) -> str:
    """
    Cleans column names to keep them consistent.
    """
    # Remove leading/trailing quotes, spaces, and brackets
    cleaned = str(header).strip().strip('"').strip("'").strip()
    return cleaned if cleaned else "Unnamed_Column"

def clean_header_locally(h: str) -> str:
    h_clean = str(h).strip()
    h_lower = h_clean.lower()
    
    if "muombbileer" in h_lower or ("customer" in h_lower and "mobile" in h_lower) or "customer n" in h_lower:
        return "Customer Mobile Number"
    if "tvialluee" in h_lower or "total bill" in h_lower or "t₹o" in h_lower:
        return "Total Bill Value"
    if "quanttitiyl" in h_lower or "quanttit" in h_lower or "quantity" in h_lower:
        if "marble" in h_lower:
            return "Total Marble & Granite Quantity"
        if "imported" in h_lower or "exotic" in h_lower:
            return "Total Imported/Exotic Quantity"
        return "Total Quantity"
    if "mtoatrabl" in h_lower or "marble & granite" in h_lower:
        if "value" in h_lower or "₹" in h_lower:
            return "Total Marble & Granite Value"
        return "Total Marble & Granite Quantity"
    if "itmotpaol" in h_lower or "imported / exotic" in h_lower:
        if "value" in h_lower or "₹" in h_lower:
            return "Total Imported/Exotic Value"
        return "Total Imported/Exotic Quantity"
    if "anmowount" in h_lower or "amount received" in h_lower:
        return "Amount Received"
    if "pkaayisme" in h_lower or "payment mode" in h_lower or "paisa" in h_lower:
        return "Payment Mode"
    if "item details" in h_lower or "remarks" in h_lower:
        return "Item Details"
    if "transaction type" in h_lower:
        return "Transaction Type"
        
    return h_clean

def clean_headers_with_ai(headers: List[str], client) -> Dict[str, str]:
    """
    Asks Gemini to rewrite garbled, overlapping, or Hinglish headers into proper English.
    """
    if not client or not headers:
        return {h: h for h in headers}
        
    prompt = f"""
You are a data mapping engine. The following list of column headers was extracted from a document table.
Due to PDF multi-line text wrapping or layout alignment issues, some headers are garbled, contain duplicate overlapping characters, or mix Hinglish phrases (e.g., 'tvialluee' should be 'Total Bill Value', 'CustomerN Muombbileer' should be 'Customer Mobile Number', 'QuantTitIyL' should be 'Quantity', 'Kya kaam hua hai?' should be removed or shortened).

Clean up each header into clean, professional, proper English words. Remove any explanatory Hinglish in parentheses (e.g., '(Paisa Kaise Aaya?)' should be removed). Keep headers concise but descriptive.

HEADERS TO TRANSLATE:
{json.dumps(headers, indent=2)}

Return ONLY a JSON object mapping each original header to its cleaned English counterpart. Do NOT write any description, code block tags, or wrap in markdown.
Example output format:
{{
  "CustomerN Muombbileer": "Customer Mobile Number",
  "TVIaLluEe - (T₹o)t al Bill": "Total Bill Value"
}}
"""
    try:
        res = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        mapping = json.loads(res.text.strip())
        return {h: mapping.get(h, h) for h in headers}
    except Exception as e:
        print(f"[Header AI] Gemini header translation failed: {e}")
        return {h: h for h in headers}


def try_parse_numeric(val: Any) -> Tuple[Any, bool]:
    """
    Attempts to clean and parse a value as float or int, supporting localized Indian formatting
    (Lakh, Crore) and numeric suffixes (k, m, etc.).
    Returns (cleaned_value, success_boolean).
    """
    if val is None:
        return None, False
        
    if isinstance(val, (int, float)):
        import math
        if math.isnan(val) or math.isinf(val):
            return None, False
        return val, True
        
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ["null", "none", "nan", "nil", "-", "—"]:
        return None, False
        
    # Standardize string: lower case, remove spaces around symbols, and common symbols/endings like "/-"
    val_clean = val_str.lower().strip()
    
    # Remove currency prefixes/suffixes, symbols and spaces
    val_clean = re.sub(r'rs\.?|inr\.?|usd\.?|eur\.?|gbp\.?|/-|[₹$€£,\s]', '', val_clean)
    
    # Regex to extract numeric portion and optional scale suffixes
    match = re.match(r'^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(.*)$', val_clean)
    if match:
        num_part = match.group(1)
        suffix_part = match.group(2).strip()
        
        try:
            num_val = float(num_part)
            multiplier = 1.0
            
            if suffix_part:
                if any(x in suffix_part for x in ["lakh", "lac"]):
                    multiplier = 100000.0
                elif any(x in suffix_part for x in ["crore", "cr"]):
                    multiplier = 10000000.0
                elif suffix_part.startswith("k") or "thousand" in suffix_part:
                    multiplier = 1000.0
                elif suffix_part.startswith("m") or "million" in suffix_part:
                    multiplier = 1000000.0
                elif suffix_part.startswith("b") or "billion" in suffix_part:
                    multiplier = 1000000000.0
            
            final_val = num_val * multiplier
            if final_val.is_integer():
                return int(final_val), True
            return final_val, True
        except ValueError:
            pass
            
    return None, False

def try_parse_date(val: Any) -> Tuple[Any, bool]:
    """
    Attempts to parse date strings and format them as YYYY-MM-DD.
    """
    if val is None:
        return None, False
        
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d"), True
        
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ["null", "none", "nan", "nil", "-", "—"]:
        return None, False
        
    # Try parsing against multiple formats
    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(val_str, fmt)
            return dt.strftime("%Y-%m-%d"), True
        except ValueError:
            continue
            
    # Try regex match for timestamp milliseconds
    if re.match(r'^\d{10,13}$', val_str):
        try:
            ts = int(val_str)
            if len(val_str) == 13: # milliseconds
                ts = ts / 1000.0
            dt = datetime.fromtimestamp(ts)
            return dt.strftime("%Y-%m-%d"), True
        except Exception:
            pass
            
    return None, False

def normalize_dataset(headers: List[str], rows: List[Dict[str, Any]], client=None) -> Tuple[List[str], List[Dict[str, Any]], Dict[str, str]]:
    """
    Normalizes dataset headers, rows, and infers types for columns.
    Returns (cleaned_headers, cleaned_rows, column_types).
    """
    if not rows:
        return [clean_header(h) for h in headers], [], {}
        
    # 1. Track values per original column to infer datatypes
    column_values = {h: [] for h in headers}
    cleaned_rows_temp = []
    seen_rows = set()
    
    for row in rows:
        cleaned_row = {}
        empty_fields = 0
        
        for orig_h, val in row.items():
            cleaned_row[orig_h] = val
            if val is None or str(val).strip() == "" or str(val).strip().lower() in ["null", "none", "nan", "nil", "-", "—"]:
                empty_fields += 1
                
        # Skip completely empty rows
        if empty_fields == len(row):
            continue
            
        row_signature = tuple(sorted((k, str(v)) for k, v in cleaned_row.items()))
        if row_signature in seen_rows:
            continue
        seen_rows.add(row_signature)
        cleaned_rows_temp.append(cleaned_row)
        
        # Collect values for schema inference
        for orig_h, val in cleaned_row.items():
            if val is not None:
                val_str = str(val).strip()
                if val_str and val_str.lower() not in ["null", "none", "nan", "nil", "-", "—"]:
                    column_values[orig_h].append(val)
                
    # 2. Infer original datatypes
    column_types_orig = {}
    for h, values in column_values.items():
        if not values:
            column_types_orig[h] = "text"
            continue
            
        numeric_successes = 0
        date_successes = 0
        
        for v in values:
            _, num_ok = try_parse_numeric(v)
            if num_ok:
                numeric_successes += 1
            _, date_ok = try_parse_date(v)
            if date_ok:
                date_successes += 1
                
        total = len(values)
        if numeric_successes / total > 0.8:
            column_types_orig[h] = "numeric"
        elif date_successes / total > 0.8:
            column_types_orig[h] = "date"
        elif len(set(str(v).lower().strip() for v in values)) / total < 0.2 and total > 5:
            column_types_orig[h] = "category"
        else:
            column_types_orig[h] = "text"

    # 3. Resolve and normalize headers using the SemanticResolver
    from analytics.schema.semantic_resolver import SemanticResolver
    resolver = SemanticResolver(client)
    cleaned_headers, schema_map = resolver.resolve_columns_batch(headers, column_types_orig, cleaned_rows_temp)
    
    header_mapping = {orig: clean for orig, clean in zip(headers, cleaned_headers)}

    # 4. Map rows to cleaned headers
    cleaned_rows = []
    for row in cleaned_rows_temp:
        cleaned_row = {}
        for orig_h, val in row.items():
            clean_h = header_mapping.get(orig_h, clean_header(orig_h))
            cleaned_row[clean_h] = val
        cleaned_rows.append(cleaned_row)

    # 5. Populate final column types
    column_types = {}
    for orig_h, t in column_types_orig.items():
        clean_h = header_mapping.get(orig_h, clean_header(orig_h))
        column_types[clean_h] = t

    # 6. Standardize column values in place based on final types
    for h, t in column_types.items():
        if t == "numeric":
            for r in cleaned_rows:
                parsed_val, num_ok = try_parse_numeric(r[h])
                r[h] = parsed_val if num_ok else None
        elif t == "date":
            for r in cleaned_rows:
                parsed_val, date_ok = try_parse_date(r[h])
                r[h] = parsed_val if date_ok else None
            
    return cleaned_headers, cleaned_rows, column_types
