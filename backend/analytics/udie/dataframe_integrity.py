import re
import pandas as pd
from typing import List, Dict, Any, Tuple

class DataFrameIntegrityException(Exception):
    """
    Exception raised when dataframe integrity checks fail (score < 95%).
    """
    def __init__(self, score: float, failed_stage: str, affected_columns: List[str], reason: str, suggested_fix: str):
        self.score = score
        self.failed_stage = failed_stage
        self.affected_columns = affected_columns
        self.reason = reason
        self.suggested_fix = suggested_fix
        super().__init__(f"DataFrame Integrity check failed: {score}% (Stage: {failed_stage}) - {reason}")

def validate_dataframe_stages(
    file_bytes: bytes,
    file_format: str,
    raw_tables: List[List[List[str]]],
    rows: List[Dict[str, Any]],
    headers: List[str],
    repaired_headers_map: Dict[str, str],
    classifications: Dict[str, Dict[str, Any]]
) -> Dict[str, Any]:
    """
    DataFrame Integrity & Stage Validation Engine.
    Performs stage-to-stage differential checks and computes an integrity score.
    If score < 95%, raises DataFrameIntegrityException.
    """
    score = 100.0
    failed_stage = ""
    affected_columns = []
    reasons = []
    suggested_fix = ""
    
    # Check if empty dataset
    if not rows:
        raise DataFrameIntegrityException(
            score=0,
            failed_stage="Extraction",
            affected_columns=[],
            reason="No data extracted from file.",
            suggested_fix="Check if the PDF has selectable text or valid grid structures."
        )

    # --- 1. Stage 2 -> 3 (Raw Tables to Parsed Dataframe Alignment) ---
    if file_format == "pdf" and raw_tables:
        first_table = raw_tables[0]
        if first_table:
            expected_cols_count = len(first_table[0])
            for i, page_table in enumerate(raw_tables):
                if len(page_table) > 0 and len(page_table[0]) != expected_cols_count:
                    # Column count mismatch across pages indicating column shift
                    penalty = 20.0
                    score -= penalty
                    failed_stage = "Parsing / Table Merging"
                    reasons.append(f"Page {i+1} table has {len(page_table[0])} columns, but Page 1 has {expected_cols_count} columns.")
                    suggested_fix = "Use a schema-aligned table merger rather than raw index concatenation."

    # --- 2. Stage 3 -> 4 (Parsed vs Cleaned Values & Column Shifts) ---
    # Detect cell shifts: check if columns have mixed values (e.g. Customer Name has numbers, or Mobile Number has words)
    col_text_count = {}
    col_num_count = {}
    
    for r in rows:
        for col in headers:
            val = r.get(col)
            if val is not None and str(val).strip() != "":
                val_str = str(val).strip()
                if val_str.lower() in ["nan", "none", "null"]:
                    continue
                col_text_count[col] = col_text_count.get(col, 0)
                col_num_count[col] = col_num_count.get(col, 0)
                
                # Check numeric/phone patterns
                if re.search(r"\d", val_str):
                    col_num_count[col] += 1
                else:
                    col_text_count[col] += 1
                    
    for col in headers:
        text_cnt = col_text_count.get(col, 0)
        num_cnt = col_num_count.get(col, 0)
        total_cnt = text_cnt + num_cnt
        # Only check mixed data types if the column has a significant presence (e.g. > 15% of the total rows)
        if total_cnt > max(5, len(rows) * 0.15):
            text_ratio = text_cnt / total_cnt
            num_ratio = num_cnt / total_cnt
            # If a column has heavily mixed content (e.g. 30% text and 70% numbers), it indicates cell alignment/shift corruption!
            if 0.15 < text_ratio < 0.85:
                # Exception: unless header explicitly allows it like "Remarks" or "Details"
                col_lower = col.lower()
                if not any(term in col_lower for term in ["remark", "detail", "note", "desc", "type", "address", "mobile", "phone", "contact", "name", "cust"]):
                    penalty = 15.0
                    score -= penalty
                    failed_stage = "Data Ingestion / Row Alignment"
                    affected_columns.append(col)
                    reasons.append(f"Column '{col}' has mixed data types ({text_ratio:.0%} text, {num_ratio:.0%} numbers), indicating row alignment shifts.")
                    suggested_fix = "Verify bounding boxes of cell grids on page lines."

    # --- 3. Stage 4 -> 5 (Header Normalization Check) ---
    # Synonymous columns are now automatically coalesced in engine.py, so we no longer penalize them.
    pass

    # --- 4. Stage 5 -> 6 (Semantic Classification Validity) ---
    # Check for category mismatch:
    # 1. Check if Phone Number/Mobile got classified as Currency or Measure
    # 2. Check if Date/Time got classified as Identifier
    for col, info in classifications.items():
        role = info.get("category", "Unknown")
        col_lower = col.lower()
        
        # Phone number columns
        if any(term in col_lower for term in ["phone", "mobile", "contact"]):
            if role in ["Currency", "Measure", "Percentage"]:
                penalty = 20.0
                score -= penalty
                failed_stage = "Semantic Column Mapping"
                affected_columns.append(col)
                reasons.append(f"Phone Number column '{col}' got classified as a metric role '{role}', which would cause invalid sum/average KPIs.")
                suggested_fix = "Strictly categorize mobile/phone columns as Identifier role."
                
        # Date columns
        if any(term in col_lower for term in ["date", "time", "timestamp"]):
            if role in ["Identifier", "Measure"]:
                penalty = 15.0
                score -= penalty
                failed_stage = "Semantic Column Mapping"
                affected_columns.append(col)
                reasons.append(f"Date column '{col}' got classified as non-temporal role '{role}', blocking trend charts.")
                suggested_fix = "Classify date/timestamp columns as Date role."

    # Final score clamp
    score = max(0.0, min(100.0, score))
    
    report = {
        "score": round(score, 2),
        "isValid": score >= 95.0,
        "failedStage": failed_stage,
        "affectedColumns": affected_columns,
        "reasons": reasons,
        "suggestedFix": suggested_fix or "Check data format alignment and column structures."
    }
    
    if score < 95.0:
        raise DataFrameIntegrityException(
            score=round(score, 2),
            failed_stage=failed_stage,
            affected_columns=affected_columns,
            reason="; ".join(reasons),
            suggested_fix=report["suggestedFix"]
        )
        
    return report
