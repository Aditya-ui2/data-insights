import json
from typing import Dict, Any, List

def generate_dashboard_insights(dashboard_config: Dict[str, Any], spreadsheet_name: str, client = None) -> Dict[str, Any]:
    """
    Builds a summary prompt of calculated statistics and sends it to Gemini
    to return a natural language executive summary and actionable recommendations.
    """
    if not client:
        # Fallback if Gemini key is missing
        dashboard_config["summary"] = "AI insights generated. Ready for analysis."
        dashboard_config["recommendations"] = [
            "Sync your data source to track metric changes.",
            "Verify outlier rows inside the profiling tab."
        ]
        return dashboard_config
        
    # Extract calculated metrics for prompt injection
    profiling = dashboard_config.get("profilingStats", {})
    summary_stats = profiling.get("summary", {})
    total_rows = summary_stats.get("totalRows", 0)
    total_cols = summary_stats.get("totalColumns", 0)
    duplicate_rows = summary_stats.get("duplicateRows", 0)
    
    kpis_list = []
    for chart in dashboard_config.get("charts", []):
        if chart.get("type") == "kpi":
            kpis_list.append(f"- {chart.get('title')}: {chart.get('value')} ({chart.get('insights', '')})")
            
    outliers_count = len(dashboard_config.get("anomalies", []))
    
    # Extract numeric correlation insights if present
    correlation = profiling.get("correlationMatrix", {})
    strong_correlations = []
    for col_a, matches in correlation.items():
        for col_b, val in matches.items():
            if col_a != col_b and val is not None and abs(val) > 0.7:
                strong_correlations.append(f"- '{col_a}' and '{col_b}' have a correlation coefficient of {val}")
    strong_correlations = list(set(strong_correlations))[:5] # deduplicate and limit
    
    prompt = f"""
You are an expert Executive Business Advisor. Your goal is to write a concise, professional executive summary and a list of actionable business recommendations based on the calculations and metrics provided below.
IMPORTANT: You must only use the numbers provided. Do not calculate anything yourself. Do not make up any numbers.

DATASET NAME: "{spreadsheet_name}"
DATASET METRICS:
- Total rows: {total_rows}
- Total columns: {total_cols}
- Duplicate rows: {duplicate_rows}
- Outliers detected: {outliers_count}

KPIs CALCULATED DETECTED:
{chr(10).join(kpis_list) if kpis_list else "No KPIs computed"}

STRONG CORRELATIONS CALCULATED:
{chr(10).join(strong_correlations) if strong_correlations else "No strong correlations found"}

Return ONLY a JSON response matching the following schema:
{{
  "summary": "Write a 3-4 sentence paragraph summarizing the overall health, performance, and trends of the business based on the KPIs and statistics. Focus on key numbers.",
  "recommendations": [
    "Write 3-4 specific, actionable recommendations based on these exact findings (e.g. addressing outliers, optimizing metrics, or investigating correlation)."
  ]
}}
Do NOT write any descriptions, explanations, or wrap in markdown.
"""
    try:
        res = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        parsed = json.loads(res.text.strip())
        
        dashboard_config["summary"] = parsed.get("summary", "Analysis completed successfully.")
        dashboard_config["recommendations"] = parsed.get("recommendations", [])
    except Exception as e:
        print(f"[Insight Gen] Gemini insights failed: {e}")
        # Standard fallback values
        dashboard_config["summary"] = f"Calculated {total_rows} total rows and {total_cols} columns. Detected {outliers_count} outliers in the dataset."
        dashboard_config["recommendations"] = [
            "Examine outlier rows shown in the profiling report to verify input quality.",
            "Utilize the business chat interface below to run custom queries on column correlations."
        ]
        
    return dashboard_config
