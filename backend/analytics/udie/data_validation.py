import re
from typing import List, Dict, Any, Tuple

def validate_extracted_data(headers: List[str], rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Module 4: Data Validation Engine.
    Validates headers and rows for missing headers, shifted columns, merged cells,
    broken datatypes, and computes an overall extraction quality confidence score.
    """
    if not headers or not rows:
        return {"isValid": False, "confidence": 0.0, "issues": ["Empty table structure"]}

    issues = []
    total_cells = len(headers) * len(rows)
    empty_cells = 0
    shifted_count = 0
    type_inconsistent_cells = 0
    
    # 1. Check Missing/Damaged Headers
    unnamed_headers = [h for h in headers if not h or "unnamed" in h.lower() or h.strip() == "" or re.match(r"^col(umn)?_?\d+$", h.lower())]
    if unnamed_headers:
        issues.append(f"Missing or system-generated headers detected: {unnamed_headers}")

    # 2. Sample value datatype detection
    col_types = {}
    for col in headers:
        # Check overall type profile of column
        # IMPORTANT: parquet NaN serializes as the string "nan" — always exclude it
        _NAN_STRINGS = {"nan", "none", "null", "", "n/a", "na", "#n/a", "nil"}
        non_null_vals = [
            r[col] for r in rows
            if r[col] is not None and str(r[col]).strip().lower() not in _NAN_STRINGS
        ]
        if not non_null_vals:
            col_types[col] = "empty"
            continue
            
        numeric_count = 0
        date_count = 0
        text_count = 0
        
        for val in non_null_vals:
            val_str = str(val).strip().lower()
            # Numeric check — handle plain floats like '12600.0', formatted like '1,23,456', currency-prefixed
            if re.match(r'^-?\d+(\.\d+)?$', val_str) or \
               re.match(r'^[₹$€£]?\s*\d{1,3}(,\d{3,})*(\.\d+)?\s*[/-]?$', val_str) or \
               re.match(r'^\d{1,3}(,\d{2,3})+(\.\d+)?$', val_str):  # Indian lakh/crore format
                numeric_count += 1
            # Date check
            elif re.match(r'^\d{4}[-/]\d{2}[-/]\d{2}$|^\d{2}[-/]\d{2}[-/]\d{4}$', val_str):
                date_count += 1
            else:
                text_count += 1
                
        total_vals = len(non_null_vals)
        if numeric_count / total_vals >= 0.7:
            col_types[col] = "numeric"
        elif date_count / total_vals >= 0.7:
            col_types[col] = "date"
        else:
            # Fallback: use pandas to_numeric for sparse-but-clearly-numeric columns.
            # This catches columns where NaN rows dilute the numeric_count ratio.
            import pandas as pd
            try:
                series_vals = pd.to_numeric(
                    pd.Series([str(v) for v in non_null_vals]).str.replace(r'[₹$€£,/-]', '', regex=True),
                    errors='coerce'
                )
                if series_vals.notna().sum() / max(len(series_vals), 1) >= 0.8:
                    col_types[col] = "numeric"
                else:
                    col_types[col] = "text"
            except Exception:
                col_types[col] = "text"

    # 3. Check shifted rows & datatype consistency
    for r_idx, r in enumerate(rows):
        row_empty = True
        non_null_in_row = 0
        for col in headers:
            val = r[col]
            if val is not None and str(val).strip() != "":
                row_empty = False
                non_null_in_row += 1
                
                # Check consistency
                expected_type = col_types.get(col, "text")
                val_str = str(val).strip().lower()
                
                if expected_type == "numeric":
                    # If expected numeric but got words without any numbers
                    if not re.search(r"\d", val_str) and val_str not in ["nan", "null", "none"]:
                        type_inconsistent_cells += 1
                        shifted_count += 1
                elif expected_type == "date":
                    if not re.match(r"^\d|^\b[a-z]{3}\b", val_str):
                        type_inconsistent_cells += 1
                        
            else:
                empty_cells += 1
                
        # Merged/broken row detection: row with only 1 value filled in a multi-column table
        if non_null_in_row == 1 and len(headers) > 3:
            issues.append(f"Row {r_idx + 1} has broken cell alignment (only 1 non-empty column)")

    # 4. Calculate overall extraction quality confidence
    unnamed_ratio = len(unnamed_headers) / len(headers) if headers else 0
    empty_ratio = empty_cells / total_cells if total_cells else 0
    shift_ratio = shifted_count / total_cells if total_cells else 0
    type_incon_ratio = type_inconsistent_cells / total_cells if total_cells else 0
    
    # Confidence starting at 1.0, subtracting penalty weights
    confidence = 1.0 - (unnamed_ratio * 0.3) - (empty_ratio * 0.25) - (shift_ratio * 0.3) - (type_incon_ratio * 0.15)
    confidence = max(0.1, min(1.0, confidence))
    
    if confidence < 0.75:
        issues.append(f"Low data quality score ({confidence:.2%}). Check column alignments.")

    return {
        "isValid": confidence >= 0.60,
        "confidence": round(confidence, 2),
        "issues": list(set(issues)),
        "typeProfile": col_types,
        "metrics": {
            "totalCells": total_cells,
            "emptyCells": empty_cells,
            "shiftedCells": shifted_count,
            "typeInconsistentCells": type_inconsistent_cells
        }
    }
