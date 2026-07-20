import re
from typing import List, Dict, Any

def contains_summary_keyword(text: str) -> bool:
    val_clean = str(text).strip().lower()
    if not val_clean:
        return False
        
    # Ignore company names to prevent false positive matching on company listings
    company_indicators = ["private", "limited", "pvt", "ltd", "corp", "inc", "co.", "industries", "solutions", "technologies", "greentech", "enterprise"]
    if any(term in val_clean for term in company_indicators):
        return False
        
    # Exact or close matches for summary labels
    exact_patterns = [
        "total", "grand total", "average", "sum", "avg", "grand_total",
        "subtotal", "sub-total", "gross total", "total/average",
        "total amount", "total due amount", "total bill value", "amount received"
    ]
    if val_clean in exact_patterns:
        return True
    
    # Check if text contains standalone total/average keywords at word boundaries
    summary_words = ["total", "grand total", "subtotal", "average", "avg", "sum"]
    for kw in summary_words:
        # Match word boundaries to prevent matching partial words
        if re.search(r'\b' + re.escape(kw) + r'\b', val_clean):
            return True
            
    return False

def detect_existing_bi_summaries(rows: List[Dict[str, Any]], headers: List[str]) -> Dict[str, Any]:
    """
    Module 9: Existing Business Intelligence Summary Detection.
    Scans row patterns to identify pre-existing totals, pivot tables, or targets
    in the spreadsheet or PDF data structure.
    Returns: {
       "summaryCards": [{"title": "X", "value": Y}],
       "summaryTables": [{"title": "Z", "headers": [...], "rows": [...]}]
    }
    """
    summary_cards = []
    summary_tables = []
    
    clean_rows = []
    
    for r_idx, r in enumerate(rows):
        row_str = " ".join([str(val).strip().lower() for val in r.values() if val is not None])
        non_empty_keys = [k for k, v in r.items() if v is not None and str(v).strip() != ""]
        n_filled = len(non_empty_keys)
        
        # Row with few filled cells & summary keyword → KPI card
        if n_filled <= 2 and len(headers) > 3 and contains_summary_keyword(row_str):
            vals = [str(r[k]).strip() for k in non_empty_keys]
            if len(vals) == 2:
                summary_cards.append({
                    "title": vals[0],
                    "value": vals[1],
                    "sourceRow": r_idx + 1
                })
            continue
        
        # Row with most cells filled → definitely data, never summary
        if n_filled > len(headers) / 2:
            clean_rows.append(r)
            continue

        is_total_row = False
        for col in headers:
            col_lower = str(col).lower()
            if any(term in col_lower for term in ["remark", "detail", "note", "desc", "comment"]):
                continue
            val_str = str(r.get(col) or "").strip().lower()
            if val_str and contains_summary_keyword(val_str):
                is_total_row = True
                break
        
        _SKIP_COL_KEYWORDS = ["mobile", "phone", "contact", "timestamp", "time", "date", "mode", "type", "name", "id", "status", "remark", "note", "description"]
        
        if is_total_row:
            for col in headers:
                col_lower = str(col).lower()
                if any(kw in col_lower for kw in _SKIP_COL_KEYWORDS):
                    continue
                val = r.get(col)
                if val is None or str(val).strip() == "":
                    continue
                if any(kw in str(val).lower() for kw in ["total", "grand"]):
                    continue
                import re as _re
                val_stripped = str(val).strip()
                digits_only = _re.sub(r'[^\d.]', '', val_stripped)
                if not digits_only and not any(c.isdigit() for c in val_stripped):
                    continue
                label = col
                for prev_col in headers:
                    if prev_col != col and r.get(prev_col) and any(kw in str(r.get(prev_col)).lower() for kw in ["total", "average"]):
                        label = f"{r.get(prev_col)} ({col})"
                        break
                summary_cards.append({
                    "title": label,
                    "value": val_stripped,
                    "sourceRow": r_idx + 1,
                    "dataKey": col
                })
            continue
            
        clean_rows.append(r)

    return {
        "summaryCards": summary_cards,
        "summaryTables": summary_tables,
        "cleanedTransactionalRows": clean_rows
    }
