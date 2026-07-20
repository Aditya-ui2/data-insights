from typing import Dict, Any

def score_column_relevance(classifications: Dict[str, Dict[str, Any]]) -> Dict[str, int]:
    """
    Module 7: Business Relevance Scoring.
    Assigns a business score (0 to 100) to each column based on its semantic classification.
    High scores (e.g. 100) represent critical analytical drivers (KPI targets or grouping fields).
    Zero scores (e.g. 0) represent non-graphable fields (IDs, Phone Numbers, UUIDs).
    """
    scores = {}
    
    # Role to score mapping
    SCORE_MAP = {
        "Identifier": 0,
        "Remarks": 10,
        "Text": 20,
        "Unknown": 20,
        "Boolean": 40,
        "Percentage": 85,
        "Category": 85,
        "Dimension": 90,
        "Date": 95,
        "Measure": 90,
        "Currency": 100
    }
    
    for col, info in classifications.items():
        cat = info.get("category", "unknown")
        
        # Default score from map or fallback to low
        score = SCORE_MAP.get(cat, 20)
        
        import re
        # Additional heuristic: If column header is an ID/Phone number/Mobile, force score 0
        col_lower = col.lower()
        if any(re.search(rf"\b{term}\b", col_lower) for term in ["phone", "mobile", "uuid", "guid", "barcode", "serial", "id"]):
            score = 0
            
        scores[col] = score
        
    return scores
