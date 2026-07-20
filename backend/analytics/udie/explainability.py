from typing import List, Dict, Any, Tuple

def inject_explainability_layer(kpis: List[Dict[str, Any]], charts: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Module 12: Explainability Layer.
    Appends transparent documentation to every KPI and Chart mapping
    exact columns, calculations, selection rules, and visual rationales.
    """
    # Process KPIs
    for kpi in kpis:
        kpi_id = kpi.get("id", "")
        data_key = kpi.get("dataKey", "")
        
        columns_used = [data_key] if data_key else []
        calc_method = "row_count"
        rules = "General dataset completeness metric check"
        rationale = "Executive KPI card summarizing overall metrics footprint."
        
        if "total" in kpi_id:
            calc_method = "sum"
            rules = "Sum aggregate rule matching resolved numeric inflow value"
            rationale = "Total volume indicator representing sum calculations over numerical values."
        elif "avg" in kpi_id:
            calc_method = "mean"
            rules = "Mean aggregate rule matching resolved numerical column"
            rationale = "Average value indicator useful for identifying normal performance scales."
        elif "unique" in kpi_id:
            calc_method = "cardinality_count"
            rules = "Distinct values unique criteria filter check"
            rationale = "Cardinality index card representing count of distinct items."
            
        kpi["explainability"] = {
            "columnsUsed": columns_used,
            "calculationMethod": calc_method,
            "generationRules": rules,
            "visualizationSelectionRationale": rationale
        }
        
    # Process Charts
    for chart in charts:
        chart_id = chart.get("id", "")
        m_col = chart.get("dataKey", "")
        d_col = chart.get("labelKey", "")
        c_type = chart.get("type", "bar")
        
        columns_used = [col for col in [m_col, d_col] if col]
        calc_method = "groupby().sum()"
        rules = "Dimensional cross-tabulation rule"
        rationale = "Visual comparison of cumulative segment values."
        
        if c_type == "area" or c_type == "line":
            calc_method = "groupby().sum() sort_by(date)"
            rules = "Time-series trend rule matching time dimension to quantitative metrics"
            rationale = "Line/Area chart displays chronological progression of metric values over time cleanly."
        elif c_type == "donut" or c_type == "pie":
            calc_method = "groupby().sum() percent_share"
            rules = "Part-to-whole segment share rule matching low-cardinality dimension"
            rationale = "Donut chart represents proportionate shares totaling 100% ratio."
        elif c_type == "horizontal_bar":
            calc_method = "groupby().sum().sort_desc().head(8)"
            rules = "Leaderboard sorting ranking rule matching high-cardinality dimension"
            rationale = "Horizontal bar chart provides readable list ranking for item labels of varying text lengths."
            
        chart["explainability"] = {
            "columnsUsed": columns_used,
            "calculationMethod": calc_method,
            "generationRules": rules,
            "visualizationSelectionRationale": rationale
        }
        
    return kpis, charts
