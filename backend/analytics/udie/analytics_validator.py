import pandas as pd
from typing import Dict, Any, Tuple

def validate_analytics_chart(
    chart_type: str,
    metric_col: str,
    dimension_col: str,
    classifications: Dict[str, Dict[str, Any]],
    relevance_scores: Dict[str, int],
    aggregation: str = None,
    df: pd.DataFrame = None
) -> Tuple[bool, str]:
    """
    Module 8: Analytics Validation Engine.
    Validates if a proposed chart configuration holds business meaning.
    Rejects illogical pairings (e.g. Phone Number vs Revenue, ID vs Quantity).
    Returns: (is_valid, reason)
    """
    # 1. Check if either column is non-graphable
    if relevance_scores.get(metric_col, 0) == 0:
        return False, f"Metric column '{metric_col}' is non-graphable (Relevance score 0)."
    if relevance_scores.get(dimension_col, 0) == 0:
        return False, f"Dimension column '{dimension_col}' is non-graphable (Relevance score 0)."
        
    metric_cat = classifications.get(metric_col, {}).get("category", "unknown")
    dim_cat = classifications.get(dimension_col, {}).get("category", "unknown")
    
    # Rejects free-text and remarks columns from being used as grouping dimensions
    if dim_cat in ["Remarks", "Text"]:
        # Bypass if it has low cardinality (indicating it's actually a clean categorical group!)
        if df is not None and dimension_col in df.columns:
            try:
                unique_count = int(df[dimension_col].nunique(dropna=True))
                if unique_count > 15:
                    return False, f"Dimension column '{dimension_col}' is categorized as free-text '{dim_cat}' and is unsuitable as a grouping key."
            except:
                return False, f"Dimension column '{dimension_col}' is categorized as free-text '{dim_cat}' and is unsuitable as a grouping key."
        else:
            return False, f"Dimension column '{dimension_col}' is categorized as free-text '{dim_cat}' and is unsuitable as a grouping key."

    # 2. Rule: Metric must be quantitative
    valid_metrics = {"Currency", "Measure", "Percentage"}
    if metric_cat not in valid_metrics:
        # If the metric is not explicitly numeric, reject unless the chart type is a row count/frequency chart or aggregation is count
        if chart_type != "bar" and aggregation != "count":
            return False, f"Target metric column '{metric_col}' has category '{metric_cat}', which is not an aggregatable numeric value."
            
    # 3. Rule: Dimension must not be a numeric metric
    if dim_cat in valid_metrics and dimension_col != metric_col:
        # We can graph metric vs time trend, but not metric vs metric in a category bar chart
        if chart_type not in ["scatter", "bubble"]:
            return False, f"Dimension '{dimension_col}' is categorized as a metric '{dim_cat}', which is unsuitable as a grouping key."
            
    # 4. Rule: Self-aggregation check (bypassed for count aggregation)
    if metric_col == dimension_col and chart_type in ["bar", "pie", "donut", "area", "line"]:
        if aggregation != "count":
            return False, f"Grouping column and aggregation metric are identical ('{metric_col}')."
            
    # 5. Rule: High cardinality check to reject primary keys/IDs (allow high-cardinality Dimensions like Customer Name)
    if df is not None and dimension_col in df.columns:
        try:
            unique_count = int(df[dimension_col].nunique(dropna=True))
            total_rows = len(df)
            dim_lower = str(dimension_col).lower()
            is_id_name = any(x in dim_lower for x in ["id", "uuid", "code", "sno", "serial", "mobile", "phone", "key"])
            if total_rows > 10 and unique_count > 0.85 * total_rows and (dim_cat == "Identifier" or is_id_name):
                return False, f"Dimension '{dimension_col}' has too high cardinality ({unique_count} unique values out of {total_rows} rows) and looks like an ID."
        except Exception:
            pass

    return True, "Valid business analytics configuration."
