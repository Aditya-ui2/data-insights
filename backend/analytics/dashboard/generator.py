import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Tuple
from analytics.ingestion.parser import parse_file
from analytics.ingestion.normalizer import normalize_dataset
from analytics.profiling.profiler import profile_dataset
from analytics.schema.schema_detector import classify_dataset_schema
from analytics.dashboard.kpi_discovery import discover_kpis
from analytics.charts.chart_selector import select_charts

def generate_analytics_payload(file_bytes: bytes, filename: str, client = None) -> Dict[str, Any]:
    """
    Executes the ingestion, profiling, schema mapping, and dashboard creation pipeline.
    Returns a unified analytics report dictionary.
    """
    # 1. Parse raw file contents
    headers, rows, row_count, file_type, rag_text = parse_file(file_bytes, filename, client)
    
    if not rows:
        raise ValueError("The uploaded file is empty or cannot be parsed as a table.")
        
    # 2. Normalize headers, types, and values
    cleaned_headers, cleaned_rows, column_types = normalize_dataset(headers, rows)
    
    # 3. Profile dataset statistics
    profiling_stats = profile_dataset(cleaned_rows, column_types)
    
    # 4. Classify schema dimensions and metrics
    schema_map = classify_dataset_schema(cleaned_headers, column_types, cleaned_rows, client)
    
    # 5. Create DataFrame for numerical KPI computation
    df = pd.DataFrame(cleaned_rows)
    
    # 6. Compute business KPIs
    kpis = discover_kpis(df, schema_map)
    
    # 7. Select relevant charts
    charts = select_charts(cleaned_headers, schema_map, column_types)
    
    # Combine KPIs and charts into DashboardConfig expected format
    dashboard_charts = []
    
    # Add KPIs
    for kpi in kpis:
        dashboard_charts.append({
            "id": kpi["id"],
            "type": "kpi",
            "title": kpi["title"],
            "dataKey": kpi["column"],
            "insights": kpi["description"],
            # Put actual value in a field the client can read
            "value": kpi["value"]
        })
        
    # Add charts
    for chart in charts:
        dashboard_charts.append(chart)
        
    # 8. Outliers list compiled from profiling
    anomalies = []
    for col, col_stats in profiling_stats.get("columns", {}).items():
        col_outliers = col_stats.get("outliers", [])
        for o in col_outliers:
            anomalies.append({
                "column": col,
                "rowNumber": o["rowNumber"],
                "value": o["value"],
                "reason": f"Value {o['value']} is a statistical outlier in column '{col}' (beyond IQR limits)."
            })
            
    # Structure final client dashboard config
    dashboard_config = {
        "charts": dashboard_charts,
        "summary": "",  # To be filled by Insight Generator
        "anomalies": anomalies,
        "recommendations": [],  # To be filled by Insight Generator
        "profilingStats": profiling_stats,
        "schemaMap": schema_map,
        "generatedAt": datetime.utcnow().isoformat()
    }
    
    return {
        "headers": cleaned_headers,
        "rows": cleaned_rows,
        "rowCount": len(cleaned_rows),
        "fileType": file_type,
        "dashboardConfig": dashboard_config
    }
