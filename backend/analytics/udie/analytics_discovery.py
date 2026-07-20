import pandas as pd
import numpy as np
import math
from typing import List, Dict, Any, Tuple
import re
from analytics.udie.analytics_validator import validate_analytics_chart

def translate_to_internal_schema_map(classifications: Dict[str, Dict[str, Any]]) -> Dict[str, str]:
    """
    Translates Rule 4 standardized roles back to existing plugins.py expectation formats.
    """
    schema_map = {}
    for col, info in classifications.items():
        role = info.get("category", "Unknown")
        col_lower = col.lower()
        
        if role == "Identifier":
            schema_map[col] = "identifier_dimension"
        elif role == "Date":
            schema_map[col] = "time_dimension"
        elif role == "Measure":
            schema_map[col] = "quantity_metric"
        elif role == "Currency":
            if any(term in col_lower for term in ["cost", "expense", "purchase", "loss", "nuksan", "kharch"]):
                schema_map[col] = "cost_metric"
            else:
                schema_map[col] = "revenue_metric"
        elif role == "Percentage":
            schema_map[col] = "revenue_metric"
        elif role == "Dimension":
            if any(term in col_lower for term in ["customer", "grahak", "client", "buyer"]):
                schema_map[col] = "customer_dimension"
            elif any(term in col_lower for term in ["employee", "staff", "karmachari", "runner", "rep"]):
                schema_map[col] = "employee_dimension"
            elif any(term in col_lower for term in ["city", "state", "region", "country", "location", "address"]):
                schema_map[col] = "geography_dimension"
            elif any(term in col_lower for term in ["product", "item", "sku"]):
                schema_map[col] = "product_dimension"
            else:
                schema_map[col] = "category_dimension"
        elif role == "Category":
            schema_map[col] = "category_dimension"
        elif role in ["Text", "Remarks"]:
            schema_map[col] = "text_dimension"
        else:
            schema_map[col] = "text_dimension"
            
    return schema_map

def compute_chart_data(df: pd.DataFrame, chart: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Computes and aggregates chart data from the pandas DataFrame.
    Returns: a list of {name, value} dicts ready to be plotted by Recharts.
    """
    m_col = chart.get("dataKey", "")
    d_col = chart.get("labelKey", "")
    agg = chart.get("aggregation", "sum")
    sort_order = chart.get("sortOrder", "desc")
    limit = chart.get("limit", 8)
    
    if not d_col or d_col not in df.columns:
        return []
        
    df_clean = df.copy()
    
    # Handle chronological/date sorting if the grouping column is a date/time
    is_date = False
    try:
        # Check if the column contains datetime-like strings
        first_vals = df_clean[d_col].dropna().head(5)
        if not first_vals.empty:
            parsed = pd.to_datetime(first_vals, errors='coerce')
            if parsed.notna().sum() >= len(first_vals) * 0.8:
                df_clean[d_col] = pd.to_datetime(df_clean[d_col], errors='coerce').dt.normalize()
                is_date = True
    except Exception:
        pass
        
    if agg == "count":
        # Group by dimension column and count the rows
        grouped = df_clean.groupby(d_col).size().reset_index(name="value")
        # Rename dimension column to "name"
        grouped = grouped.rename(columns={d_col: "name"})
    else:
        if m_col not in df_clean.columns:
            return []
        # Convert metric column to numeric
        try:
            df_clean[m_col] = pd.to_numeric(df_clean[m_col].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors='coerce')
        except Exception:
            df_clean[m_col] = pd.to_numeric(df_clean[m_col], errors='coerce')
            
        if agg == "average" or agg == "mean":
            grouped = df_clean.groupby(d_col)[m_col].mean().reset_index(name="value")
        elif agg == "min":
            grouped = df_clean.groupby(d_col)[m_col].min().reset_index(name="value")
        elif agg == "max":
            grouped = df_clean.groupby(d_col)[m_col].max().reset_index(name="value")
        else: # default to sum
            grouped = df_clean.groupby(d_col)[m_col].sum().reset_index(name="value")
            
        grouped = grouped.rename(columns={d_col: "name"})
        
    # Drop rows where name or value is null
    grouped = grouped.dropna(subset=["name"])
    grouped["value"] = grouped["value"].fillna(0)
    
    # Convert date/time names to string format
    if is_date:
        grouped["name"] = grouped["name"].dt.strftime('%Y-%m-%d')
        # Sort chronologically ascending
        grouped = grouped.sort_values(by="name", ascending=True)
    else:
        # Sort by value
        ascending = (sort_order == "asc")
        grouped = grouped.sort_values(by="value", ascending=ascending)
        
    # Limit to top N
    if limit:
        grouped = grouped.head(limit)
        
    # Convert values to standard Python types
    result = []
    for _, row in grouped.iterrows():
        val = row["value"]
        if isinstance(val, (float, np.float64)):
            if np.isnan(val) or np.isinf(val):
                val = 0.0
            else:
                val = round(float(val), 2)
        elif isinstance(val, (int, np.int64)):
            val = int(val)
        result.append({
            "name": str(row["name"]),
            "value": val
        })
        
    return result

def discover_analytics(
    df: pd.DataFrame,
    headers: List[str],
    classifications: Dict[str, Dict[str, Any]],
    relevance_scores: Dict[str, int],
    client = None,
    canonical_mapping: Dict[str, dict] = None
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Module 10: Intelligent Analytics Discovery.
    Orchestrates the existing plugins and DiscoveryEngine calculations, then applies 
    strict Rule 3/5/10 filtering to ensure accuracy and remove duplicate/empty graphs.
    """
    kpis = []
    charts = []
    anomalies = []
    
    # 0. Generic Category Value Self-Healing (Fuzzy Clustering of Rare Typos)
    import difflib
    for col in df.columns:
        dtype_str = str(df[col].dtype).lower()
        if "object" in dtype_str or "string" in dtype_str or "str" in dtype_str or "category" in dtype_str:
            series_clean = df[col].dropna().astype(str).str.strip()
            if series_clean.empty:
                continue
                
            counts = series_clean.value_counts()
            total_count = len(series_clean)
            
            # Common categories: must occur at least 3 times or comprise >= 5% of rows
            common_vals = [val for val, count in counts.items() if count >= 3 or (count / total_count) >= 0.05]
            # Rare categories: occur <= 2 times and comprise < 3% of rows (probable typos/OCR merges)
            rare_vals = [val for val, count in counts.items() if count <= 2 and (count / total_count) < 0.03]
            
            if not common_vals or not rare_vals:
                continue
                
            healing_map = {}
            for rare in rare_vals:
                rare_clean = re.sub(r'[^a-zA-Z0-9]', '', rare).lower()
                if len(rare) < 3:
                    continue
                best_match = None
                best_ratio = 0.0
                for common in common_vals:
                    ratio = difflib.SequenceMatcher(None, rare, common).ratio()
                    common_clean = re.sub(r'[^a-zA-Z0-9]', '', common).lower()
                    clean_ratio = difflib.SequenceMatcher(None, rare_clean, common_clean).ratio()
                    
                    max_ratio = max(ratio, clean_ratio)
                    if max_ratio > 0.72 and max_ratio > best_ratio:
                        best_ratio = max_ratio
                        best_match = common
                        
                if best_match:
                    healing_map[rare] = best_match
                    
            def apply_healing(val):
                if val is None or pd.isna(val):
                    return val
                val_str = str(val).strip()
                # Resolve mapping, keep spacing clean
                healed = healing_map.get(val_str, val_str)
                return re.sub(r'\s+', ' ', healed)
                
            if healing_map:
                print(f"[Generic Category Healer] Mapped rare categories in '{col}': {healing_map}", flush=True)
                df[col] = df[col].apply(apply_healing)

    # 1. Translate classifications back to internal schema_map
    schema_map = translate_to_internal_schema_map(classifications)
    
    # 2. Reconstruct column types
    column_types = {}
    for col in headers:
        role = classifications.get(col, {}).get("category", "Unknown")
        if role in ["Currency", "Measure", "Percentage"]:
            column_types[col] = "numeric"
        elif role == "Date":
            column_types[col] = "date"
        elif role == "Category":
            column_types[col] = "category"
        else:
            column_types[col] = "text"

    # 3. Invoke existing kpi_discovery and chart_selector to execute domain plugins
    from analytics.dashboard.kpi_discovery import discover_kpis
    from analytics.charts.chart_selector import select_charts
    
    try:
        raw_kpis = discover_kpis(df, schema_map, client=client, canonical_mapping=canonical_mapping)
    except Exception as e:
        print(f"[UDIE Discovery] Failed to run domain discover_kpis: {e}", flush=True)
        raw_kpis = []

    if not raw_kpis:
        from analytics.dashboard.kpi_registry import discover_registry_kpis
        try:
            print("[UDIE Discovery Failover] Empty raw KPIs. Falling back to local registry.")
            raw_kpis = discover_registry_kpis(df, schema_map)
        except Exception as ex:
            print(f"[UDIE Discovery Failover] Failed to run discover_registry_kpis: {ex}")

    try:
        raw_charts = select_charts(headers, schema_map, column_types, df=df, client=client,
                                   canonical_mapping=canonical_mapping)
    except Exception as e:
        print(f"[UDIE Discovery] Failed to run domain select_charts: {e}", flush=True)
        raw_charts = []

    if not raw_charts:
        from analytics.dashboard.kpi_registry import discover_registry_charts
        try:
            print("[UDIE Discovery Failover] Empty raw charts. Falling back to local registry.")
            raw_charts = discover_registry_charts(df, schema_map, column_types)
        except Exception as ex:
            print(f"[UDIE Discovery Failover] Failed to run discover_registry_charts: {ex}")

    # 4. Apply Rule 3 & 10 filters on discovered KPIs
    seen_kpi_ids = set()
    seen_kpi_titles = set()
    
    for kpi in raw_kpis:
        col = kpi.get("column", "")
        # Rule 3 check: Rejects KPIs based on Identifier or 0 relevance score
        if col and (classifications.get(col, {}).get("category") == "Identifier" or relevance_scores.get(col, 1) == 0):
            continue
            
        # Filter out garbage columns (e.g. col0, col1, unnamed_3, col_4)
        col_lower = str(col).lower()
        if col_lower:
            garbage_pattern = r'^col(umn)?\d*$|^unnamed_?\d*$'
            if re.match(garbage_pattern, col_lower) or "col_" in col_lower or "col " in col_lower:
                continue

        title = kpi.get("title", "").strip()
        kpi_id = kpi.get("id", "")
        
        # Rule 10 check: Reject duplicate KPIs
        if kpi_id in seen_kpi_ids or title in seen_kpi_titles:
            continue
            
        val = kpi.get("value")
        if pd.isna(val) or val is None or str(val).strip() == "":
            continue
            
        seen_kpi_ids.add(kpi_id)
        seen_kpi_titles.add(title)
        
        kpis.append({
            "id": kpi_id,
            "type": "kpi",
            "title": title,
            "value": val,
            "dataKey": col,
            "insights": kpi.get("description", f"Summary value of {title}")
        })

    # 5. Apply Rule 5 & 10 filters and rank charts based on business growth value
    seen_chart_titles = set()
    seen_label_keys = set()
    scored_charts = []
    for chart in raw_charts:
        m_col = chart.get("dataKey", "")
        d_col = chart.get("labelKey", "")
        chart_type = chart.get("type", "bar")
        title = chart.get("title", "").strip()
        aggregation = chart.get("aggregation", "sum")
        
        # Filter out dummy/empty columns (e.g. col0, col1, unnamed_3, col_4)
        m_lower = str(m_col).lower()
        d_lower = str(d_col).lower()
        garbage_pattern = r'^col(umn)?\d*$|^unnamed_?\d*$'
        if re.match(garbage_pattern, m_lower) or re.match(garbage_pattern, d_lower):
            continue
        if "col_" in m_lower or "col " in m_lower or "col_" in d_lower or "col " in d_lower:
            continue
        if "mobile" in m_lower or "phone" in m_lower or "mobile" in d_lower or "phone" in d_lower:
            continue
        if relevance_scores.get(m_col, 100) == 0 or relevance_scores.get(d_col, 100) == 0:
            continue
            
        # Rule 5 check: Graph validation pairing checks
        is_valid, reason = validate_analytics_chart(
            chart_type=chart_type,
            metric_col=m_col,
            dimension_col=d_col,
            classifications=classifications,
            relevance_scores=relevance_scores,
            aggregation=aggregation,
            df=df
        )
        if not is_valid:
            print(f"[Chart Validation Filtered] {title}: {reason}")
            continue
            
        # Compute pre-aggregated data
        chart_data = compute_chart_data(df, chart)
        if not chart_data:
            print(f"[Chart Data Empty] {title}: no data computed.")
            continue
            
        # Drop empty charts or charts where all values are 0 or empty
        valid_values = [item["value"] for item in chart_data if item["value"] is not None]
        if not valid_values or all(v == 0 or v == 0.0 for v in valid_values):
            print(f"[Chart Data Empty/Zero] {title}: all values are 0.")
            continue
            
        # Reject chart if it has 0 or 1 data point (not useful for comparisons)
        if len(chart_data) <= 1:
            print(f"[Chart Data Single Point] {title}: contains only {len(chart_data)} data point.")
            continue
            
        chart["data"] = chart_data
            
        # Rule 10 check: Reject duplicate charts (deduplicate by title and labelKey/dimension)
        title_norm = title.lower().strip()
        if title_norm in seen_chart_titles or d_lower in seen_label_keys:
            continue
            
        seen_chart_titles.add(title_norm)
        seen_label_keys.add(d_lower)
        
        # Calculate business value score
        score = 0
        m_role = classifications.get(m_col, {}).get("category", "Unknown")
        d_role = classifications.get(d_col, {}).get("category", "Unknown")
        
        # Currency metrics (revenue/sales) are highest business growth priority
        if m_role == "Currency":
            score += 50
        elif m_role == "Measure":
            score += 30
        elif m_role == "Percentage":
            score += 20
        elif m_role == "Date":
            score += 10
            
        # Dimension priority
        if d_role == "Date" or "date" in d_lower or "timestamp" in d_lower:
            score += 40  # Time series trend is highly valuable
        elif d_role == "Dimension":
            if "customer" in d_lower or "client" in d_lower or "buyer" in d_lower:
                score += 35  # Client concentration
            elif "product" in d_lower or "item" in d_lower or "maal" in d_lower:
                score += 30  # Product revenue performance
            elif "employee" in d_lower or "staff" in d_lower or "karmachari" in d_lower:
                score += 25  # Staff performance
            else:
                score += 20
        elif d_role == "Category":
            if "payment" in d_lower or "mode" in d_lower:
                score += 30  # Payment mode distribution
            elif "type" in d_lower or "status" in d_lower or "department" in d_lower:
                score += 25  # Main business segments
            else:
                score += 15
        else:
            score += 5
            
        # Favor sum or count aggregations over averages/min/max
        if aggregation == "sum":
            score += 15
        elif aggregation == "count":
            score += 10
        elif aggregation == "average":
            score += 5
            
        # Limit penalty if too many slices
        if len(chart_data) > 10:
            score -= 10
            
        scored_charts.append((score, chart))
        
    # Sort charts by score descending and take the top 8
    scored_charts.sort(key=lambda x: x[0], reverse=True)
    charts = [item[1] for item in scored_charts[:8]]

    # 6. Outlier loop for anomalies
    all_numeric_cols = [c for c, info in classifications.items() if info["category"] in ["Currency", "Measure", "Percentage"]]
    df_calc = df.copy()
    for col in all_numeric_cols:
        try:
            df_calc[col] = pd.to_numeric(df_calc[col].astype(str).str.replace(r'[^\d.-]', '', regex=True), errors='coerce')
            series = df_calc[col].dropna()
            if len(series) > 5:
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                outliers = df_calc[(df_calc[col] < lower_bound) | (df_calc[col] > upper_bound)]
                for idx, r in outliers.head(10).iterrows():
                    anomalies.append({
                        "column": col,
                        "value": float(r[col]),
                        "rowNumber": int(idx) + 1,
                        "reason": f"Value {float(r[col])} in column '{col}' is a statistical outlier (IQR threshold: [{round(lower_bound, 1)}, {round(upper_bound, 1)}])"
                    })
        except Exception:
            pass
    # 7. AI Verification and Pruning Loop (Filter out low-value, duplicate or messy KPIs/charts)
    if client and (kpis or charts):
        try:
            import json
            print("[Analytics Discovery AI] Filtering and polishing KPIs and charts using Gemini...", flush=True)
            kpis_summary = []
            for k in kpis:
                kpis_summary.append({
                    "id": k["id"],
                    "title": k["title"],
                    "value": str(k["value"]),
                    "dataKey": k.get("dataKey", "")
                })
                
            charts_summary = []
            for c in charts:
                charts_summary.append({
                    "title": c["title"],
                    "dataKey": c["dataKey"],
                    "labelKey": c["labelKey"],
                    "aggregation": c.get("aggregation", ""),
                    "sampleData": c.get("data", [])[:3]
                })
                
            prompt = f"""
You are a senior Business Intelligence (BI) analyst. Review the following automatically discovered KPIs and charts from a dataset.
Some of these might be low-value, duplicate, or meaningless (e.g. counting phone numbers, summing unique identifiers, averaging transaction codes, or empty metrics).

Filter and polish them to keep only the highest-value insights that would be relevant to a business owner.
1. Limit to a maximum of 12 KPIs and 8 Charts.
2. Select only KPIs/charts that show real business outcomes (revenue, volume, performance, count of records, etc.).
3. Rename the titles/descriptions to be extremely professional, clean, and grammatically correct English (e.g., instead of "Sum of total bill value by payment mode", use "Revenue Distribution by Payment Method").

DISCOVERED KPIS:
{json.dumps(kpis_summary, indent=2)}

DISCOVERED CHARTS:
{json.dumps(charts_summary, indent=2)}

Return ONLY a JSON response in the following schema format:
{{
  "selectedKpis": [
     {{
        "id": "kpi_total_records",
        "polishedTitle": "Total Transactions",
        "polishedInsights": "Total transaction rows processed from the spreadsheet"
     }}
  ],
  "selectedCharts": [
     {{
        "originalTitle": "Original Chart Title Here",
        "polishedTitle": "Polished Chart Title"
     }}
  ]
}}
"""
            from analytics.utils.llm_client import generate_content_safe
            res_text = generate_content_safe(client, prompt, json_mode=True)
            parsed_selection = json.loads(res_text)
            
            selected_kpis_info = parsed_selection.get("selectedKpis", [])
            selected_charts_info = parsed_selection.get("selectedCharts", [])
            
            if selected_kpis_info or selected_charts_info:
                filtered_kpis = []
                for k_info in selected_kpis_info:
                    k_id = k_info.get("id")
                    for k in kpis:
                        if k["id"] == k_id:
                            k["title"] = k_info.get("polishedTitle", k["title"])
                            k["insights"] = k_info.get("polishedInsights", k.get("insights", ""))
                            filtered_kpis.append(k)
                            break
                            
                filtered_charts = []
                for c_info in selected_charts_info:
                    orig_title = c_info.get("originalTitle")
                    for c in charts:
                        if c["title"].lower().strip() == orig_title.lower().strip():
                            c["title"] = c_info.get("polishedTitle", c["title"])
                            filtered_charts.append(c)
                            break
                            
                if filtered_kpis:
                    kpis = filtered_kpis
                if filtered_charts:
                    charts = filtered_charts
        except Exception as filter_err:
            print(f"[Analytics Discovery AI] Gemini filtering failed: {filter_err}. Returning raw results.", flush=True)

    cleaned_kpis = []
    seen_titles = set()
    seen_ids = set()
    
    for k in kpis:
        kpi_id = k.get("id", "")
        title = k.get("title", "").strip()
        if kpi_id in seen_ids or title in seen_titles:
            continue
        seen_ids.add(kpi_id)
        seen_titles.add(title)
        cleaned_kpis.append(k)
    
    kpis = cleaned_kpis

    return kpis, charts, anomalies
