import pandas as pd
import numpy as np
from typing import List, Dict, Any

def calculate_outliers(df: pd.DataFrame, column: str) -> List[Dict[str, Any]]:
    """
    Finds outliers using the Interquartile Range (IQR) rule.
    Returns list of outlier records with index and value.
    """
    outliers = []
    try:
        series = pd.to_numeric(df[column], errors='coerce').dropna()
        if len(series) < 4:
            return []
            
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        # Get outliers indices and values
        outlier_series = series[(series < lower_bound) | (series > upper_bound)]
        for idx, val in outlier_series.items():
            outliers.append({
                "rowNumber": int(idx) + 1,
                "value": float(val) if isinstance(val, (float, np.float64)) else int(val)
            })
    except Exception as e:
        print(f"[Profiling Outliers] Outlier calculation failed for column {column}: {e}")
    return outliers[:50] # Cap outliers display list to 50 items

def profile_dataset(rows: List[Dict[str, Any]], column_types: Dict[str, str]) -> Dict[str, Any]:
    """
    Calculates detailed profiling statistics for the dataset.
    """
    if not rows:
        return {}
        
    df = pd.DataFrame(rows)
    total_rows = len(df)
    total_cols = len(df.columns)
    
    # 1. Duplicate rows count
    duplicate_rows = int(df.duplicated().sum())
    
    # 2. Datatype distribution
    datatype_distribution = {}
    for t in column_types.values():
        datatype_distribution[t] = datatype_distribution.get(t, 0) + 1
        
    # 3. Column-specific profiling
    column_stats = {}
    for col in df.columns:
        col_type = column_types.get(col, "text")
        series = df[col]
        missing_count = int(series.isna().sum() + (series == "").sum())
        unique_count = int(series.nunique(dropna=True))
        
        stats: Dict[str, Any] = {
            "type": col_type,
            "missingValues": missing_count,
            "missingPercentage": round((missing_count / total_rows) * 100, 2),
            "uniqueValues": unique_count,
        }
        
        # Numeric column statistics
        if col_type == "numeric":
            numeric_series = pd.to_numeric(series, errors='coerce').dropna()
            if not numeric_series.empty:
                # Basic stats
                val_min = float(numeric_series.min())
                val_max = float(numeric_series.max())
                val_mean = float(numeric_series.mean())
                val_median = float(numeric_series.median())
                val_std = float(numeric_series.std()) if len(numeric_series) > 1 else 0.0
                val_var = float(numeric_series.var()) if len(numeric_series) > 1 else 0.0
                val_skew = float(numeric_series.skew()) if len(numeric_series) > 2 else 0.0
                
                # Check for NaNs and format
                stats.update({
                    "min": val_min if not np.isnan(val_min) else None,
                    "max": val_max if not np.isnan(val_max) else None,
                    "mean": round(val_mean, 2) if not np.isnan(val_mean) else None,
                    "median": round(val_median, 2) if not np.isnan(val_median) else None,
                    "std": round(val_std, 2) if not np.isnan(val_std) else None,
                    "variance": round(val_var, 2) if not np.isnan(val_var) else None,
                    "skewness": round(val_skew, 2) if not np.isnan(val_skew) else None,
                })
                
                # Detect outliers
                stats["outliers"] = calculate_outliers(df, col)
            else:
                stats.update({k: None for k in ["min", "max", "mean", "median", "std", "variance", "skewness"]})
                stats["outliers"] = []
                
        # Categorical distribution preview
        elif col_type in ["category", "text", "date"]:
            value_counts = series.dropna().value_counts().head(5).to_dict()
            stats["topFrequencies"] = {str(k): int(v) for k, v in value_counts.items()}
            
        column_stats[col] = stats
        
    # 4. Correlation Matrix for numerical columns
    correlation_matrix = {}
    numeric_cols = [c for c, t in column_types.items() if t == "numeric"]
    if len(numeric_cols) >= 2:
        try:
            # Cast columns to numeric to compute correlation
            numeric_df = df[numeric_cols].apply(pd.to_numeric, errors='coerce')
            corr_df = numeric_df.corr().round(3)
            # Replace NaNs with None for JSON compliance
            corr_df = corr_df.where(pd.notna(corr_df), None)
            correlation_matrix = corr_df.to_dict()
        except Exception as e:
            print(f"[Profiling Correlation] Failed to compute correlation: {e}")
            
    result = {
        "summary": {
            "totalRows": total_rows,
            "totalColumns": total_cols,
            "duplicateRows": duplicate_rows,
            "datatypeDistribution": datatype_distribution
        },
        "columns": column_stats,
        "correlationMatrix": correlation_matrix
    }
    return sanitize_float_values(result)

def sanitize_float_values(obj: Any) -> Any:
    """
    Recursively replaces NaN, inf, and -inf float values in a dictionary or list
    with None (JSON null) to guarantee JSON compliance.
    """
    import math
    if isinstance(obj, dict):
        return {k: sanitize_float_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_float_values(x) for x in obj]
    elif isinstance(obj, tuple):
        return tuple(sanitize_float_values(x) for x in obj)
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, np.floating):
        val = float(obj)
        if math.isnan(val) or math.isinf(val):
            return None
        return val
    elif isinstance(obj, np.integer):
        return int(obj)
    return obj

