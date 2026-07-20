import pandas as pd
import numpy as np
from typing import List, Dict, Any

KPI_TEMPLATES = [
    # --- SALES & E-COMMERCE ---
    {
        "title": "Total Sales Revenue",
        "domain": "Sales",
        "aggregation": "sum",
        "required_role": "revenue_metric",
        "alternate_names": ["sales", "revenue", "bill value", "billing", "amount", "total amount", "bikri", "paisa", "maal bika", "payment val"],
        "description": "Total cumulative sales revenue generated.",
        "formula": "Sum(Sales Volume * Unit Price)",
        "chart_types": ["bar", "line", "area"],
        "priority": "CEO/Finance",
        "thresholds": {"type": "min_value", "good": 100000, "warning": 50000, "critical": 10000},
        "recommended_actions": "Review top performing products and optimize pricing strategy to sustain growth."
    },
    {
        "title": "Average Order Value (AOV)",
        "domain": "Sales",
        "aggregation": "mean",
        "required_role": "revenue_metric",
        "alternate_names": ["sales", "revenue", "bill value", "billing", "amount", "total amount", "bikri"],
        "description": "Average transaction size per order.",
        "formula": "Total Revenue / Total Orders",
        "chart_types": ["gauge", "bar"],
        "priority": "Sales",
        "thresholds": {"type": "min_value", "good": 5000, "warning": 2500, "critical": 1000},
        "recommended_actions": "Implement product bundling or upselling recommendations during checkout."
    },
    {
        "title": "Total Items Sold",
        "domain": "Sales",
        "aggregation": "sum",
        "required_role": "quantity_metric",
        "alternate_names": ["qty", "quantity", "units", "pieces", "pcs", "volume", "sold qty", "matra"],
        "description": "Total volume of product units sold.",
        "formula": "Sum(Quantity Sold)",
        "chart_types": ["bar", "line"],
        "priority": "Operations",
        "thresholds": {"type": "min_value", "good": 10000, "warning": 5000, "critical": 1000},
        "recommended_actions": "Verify inventory replenishment schedules to prevent stockouts of high-demand items."
    },
    # --- RETAIL ---
    {
        "title": "Gross Transaction Value",
        "domain": "Retail",
        "aggregation": "sum",
        "required_role": "revenue_metric",
        "alternate_names": ["bill value", "total value", "gross sales", "sale amount"],
        "description": "Total value of items transacted.",
        "formula": "Sum(Gross Billing Items)",
        "chart_types": ["bar", "line"],
        "priority": "Finance",
        "thresholds": {"type": "min_value", "good": 150000, "warning": 75000, "critical": 20000},
        "recommended_actions": "Examine high value basket combinations to design seasonal store layout changes."
    },
    # --- FINANCE & ACCOUNTING ---
    {
        "title": "Total Operating Cost",
        "domain": "Finance",
        "aggregation": "sum",
        "required_role": "cost_metric",
        "alternate_names": ["cost", "expense", "spend", "purchases", "kharch", "kharcha", "loss", "nuksan"],
        "description": "Total operational spending or procurement outflows.",
        "formula": "Sum(Costs + Expenses)",
        "chart_types": ["bar", "pie"],
        "priority": "Finance",
        "thresholds": {"type": "max_value", "good": 50000, "warning": 100000, "critical": 200000},
        "recommended_actions": "Audit top expense heads and negotiate bulk rates with suppliers to cut down costs."
    },
    {
        "title": "Net Margin Contribution",
        "domain": "Finance",
        "aggregation": "mean",
        "required_role": "revenue_metric",
        "alternate_names": ["margin", "profit", "net income", "earnings", "net balance", "balance"],
        "description": "Average profit contribution per transaction row.",
        "formula": "Mean(Revenue - Cost)",
        "chart_types": ["gauge", "line"],
        "priority": "CEO",
        "thresholds": {"type": "min_value", "good": 1500, "warning": 750, "critical": 200},
        "recommended_actions": "Prune low-margin products from catalog or optimize logistic overheads."
    },
    # --- INVENTORY & SUPPLY CHAIN ---
    {
        "title": "Average Inventory Holding Value",
        "domain": "Inventory",
        "aggregation": "mean",
        "required_role": "quantity_metric",
        "alternate_names": ["inventory", "stock", "holding qty", "available qty", "closing stock", "safety stock"],
        "description": "Average count of units held in warehouses.",
        "formula": "Mean(Stock Level)",
        "chart_types": ["bar", "line"],
        "priority": "Operations",
        "thresholds": {"type": "range", "min": 2000, "max": 15000},
        "recommended_actions": "Run a stock turnover audit to clear obsolete stock items."
    },
    # --- HUMAN RESOURCES ---
    {
        "title": "Total Karmachari (Employee) Headcount",
        "domain": "HR",
        "aggregation": "count",
        "required_role": "employee_dimension",
        "alternate_names": ["employee", "staff", "runner", "rep", "agent", "salesperson", "karmachari"],
        "description": "Total count of active registered representatives.",
        "formula": "CountUnique(Employee Name / ID)",
        "chart_types": ["gauge"],
        "priority": "Operations",
        "thresholds": {"type": "min_value", "good": 50, "warning": 20, "critical": 5},
        "recommended_actions": "Optimize workload allocation across existing representative counts."
    },
    # --- SAAS & SUBSCRIPTIONS ---
    {
        "title": "Monthly Recurring Revenue (MRR) equivalent",
        "domain": "SaaS",
        "aggregation": "sum",
        "required_role": "revenue_metric",
        "alternate_names": ["subscription", "mrr", "recurring", "license fee"],
        "description": "Monthly recurring subscription billing baseline.",
        "formula": "Sum(Recurring Licenses)",
        "chart_types": ["line", "area"],
        "priority": "CEO/Finance",
        "thresholds": {"type": "min_value", "good": 80000, "warning": 40000, "critical": 10000},
        "recommended_actions": "Optimize product onboarding steps to improve trial-to-paid conversion metrics."
    },
    # --- CRM & CUSTOMER ACQUISITION ---
    {
        "title": "Active Customer Footprint",
        "domain": "CRM",
        "aggregation": "nunique",
        "required_role": "customer_dimension",
        "alternate_names": ["customer", "client", "buyer", "grahak", "patron", "customer name"],
        "description": "Count of unique transacting accounts.",
        "formula": "CountUnique(Customer ID / Name)",
        "chart_types": ["gauge"],
        "priority": "CEO/Sales",
        "thresholds": {"type": "min_value", "good": 100, "warning": 50, "critical": 10},
        "recommended_actions": "Run a churn recovery campaign Targeting customers inactive for over 30 days."
    }
]

from analytics.ingestion.normalizer import try_parse_numeric

def safe_sum(df, col):
    try:
        vals = []
        for x in df[col]:
            p, ok = try_parse_numeric(x)
            if ok and p is not None:
                vals.append(float(p))
        return sum(vals) if vals else 0.0
    except:
        return 0.0

def safe_mean(df, col):
    try:
        vals = []
        for x in df[col]:
            p, ok = try_parse_numeric(x)
            if ok and p is not None:
                vals.append(float(p))
        return sum(vals) / len(vals) if vals else 0.0
    except:
        return 0.0

def safe_unique(df, col):
    try:
        return int(df[col].nunique(dropna=True))
    except:
        return 0

def discover_registry_kpis(df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
    """
    Scans the dataset columns, matches them against the alternate names and required semantic roles
    in the KPI templates, and computes rule-based aggregates locally.
    """
    discovered_kpis = []
    
    # Pre-calculate clean column headers lower for matching
    cols_lower = {col.lower().replace(" ", "_").replace("-", "_"): col for col in df.columns}
    
    for template in KPI_TEMPLATES:
        # Find matching column based on required role first, then keywords
        matching_col = None
        required_role = template["required_role"]
        
        # 1. Match by semantic role
        role_cols = [c for c, role in schema_map.items() if role == required_role]
        if role_cols:
            # Pick the best name matching column using alternate name keywords
            for alt in template["alternate_names"]:
                for c in role_cols:
                    if alt in c.lower():
                        matching_col = c
                        break
                if matching_col:
                    break
            # Fallback to the first column with matching role if no keyword match
            if not matching_col:
                matching_col = role_cols[0]
                
        # 2. If no role matched, try to match by alternate keywords globally
        if not matching_col:
            for alt in template["alternate_names"]:
                # Match exact or partial word
                for clean_lbl, orig_col in cols_lower.items():
                    if alt == clean_lbl or alt in orig_col.lower():
                        matching_col = orig_col
                        break
                if matching_col:
                    break
                    
        # If we successfully bound a column, compute the KPI value
        if matching_col and matching_col in df.columns:
            agg = template["aggregation"]
            val = 0.0
            
            try:
                series = df[matching_col]
                # Coerce to numeric for metric sums/means
                if agg in ["sum", "mean"]:
                    val = safe_sum(df, matching_col) if agg == "sum" else safe_mean(df, matching_col)
                elif agg == "nunique":
                    val = safe_unique(df, matching_col)
                elif agg == "count":
                    val = int(series.dropna().count())
            except Exception as e:
                print(f"[KPI Registry] Failed to compute KPI '{template['title']}': {e}")
                continue
                
            # Round float values
            if isinstance(val, float):
                if np.isnan(val) or np.isinf(val):
                    val = 0.0
                else:
                    val = round(val, 2)
                
            discovered_kpis.append({
                "id": f"kpi_registry_{template['title'].lower().replace(' ', '_')}",
                "title": template["title"],
                "value": val,
                "type": "count" if agg in ["count", "nunique"] else "currency" if required_role in ["revenue_metric", "cost_metric"] else "number",
                "column": matching_col,
                "description": template["description"]
            })
            
    return discovered_kpis


def discover_registry_charts(df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
    """
    Generates high-value dashboard visualizations using local rules based on matched
    dimensions and metrics, preventing duplicate grouping fields.
    """
    charts = []
    
    # 1. Separate metrics and dimensions
    revenue_cols = [c for c, role in schema_map.items() if role in ["revenue_metric", "cost_metric"]]
    qty_cols = [c for c, role in schema_map.items() if role == "quantity_metric"]
    metric_cols = revenue_cols + qty_cols
    
    time_cols = [c for c, role in schema_map.items() if role == "time_dimension"]
    cust_cols = [c for c, role in schema_map.items() if role == "customer_dimension"]
    prod_cols = [c for c, role in schema_map.items() if role == "product_dimension"]
    geo_cols = [c for c, role in schema_map.items() if role == "geography_dimension"]
    cat_cols = [c for c, role in schema_map.items() if role == "category_dimension"]
    
    all_dims = time_cols + cust_cols + prod_cols + cat_cols + geo_cols
    
    if not metric_cols or not all_dims:
        return []
        
    primary_metric = metric_cols[0]
    seen_label_keys = set()
    
    # A. Revenue / Value Trend over Time (Area Chart)
    if time_cols:
        lbl = time_cols[0]
        seen_label_keys.add(lbl.lower())
        charts.append({
            "id": "chart_registry_time_trend",
            "type": "area",
            "title": f"{primary_metric} Trend over Time",
            "dataKey": primary_metric,
            "labelKey": lbl,
            "aggregation": "sum",
            "insights": f"Visualizes chronological variations in {primary_metric} totals."
        })
        
    # B. Product Revenue Performance (Bar Chart)
    if prod_cols:
        lbl = prod_cols[0]
        if lbl.lower() not in seen_label_keys:
            seen_label_keys.add(lbl.lower())
            charts.append({
                "id": "chart_registry_product_perf",
                "type": "bar",
                "title": f"Top Products by {primary_metric}",
                "dataKey": primary_metric,
                "labelKey": lbl,
                "aggregation": "sum",
                "sortOrder": "desc",
                "limit": 8,
                "insights": f"Identifies highest contribution products towards {primary_metric} totals."
            })
            
    # C. Customer purchasing volume (Horizontal Bar)
    if cust_cols:
        lbl = cust_cols[0]
        if lbl.lower() not in seen_label_keys:
            seen_label_keys.add(lbl.lower())
            charts.append({
                "id": "chart_registry_customer_perf",
                "type": "bar",
                "title": f"Top Customers by {primary_metric}",
                "dataKey": primary_metric,
                "labelKey": lbl,
                "aggregation": "sum",
                "sortOrder": "desc",
                "limit": 6,
                "insights": "Displays key accounts contributing most to cumulative volume."
            })
            
    # D. Category segment share (Pie / Donut Chart)
    if cat_cols:
        lbl = cat_cols[0]
        if lbl.lower() not in seen_label_keys:
            seen_label_keys.add(lbl.lower())
            charts.append({
                "id": "chart_registry_category_distribution",
                "type": "donut",
                "title": f"{primary_metric} Split by {lbl}",
                "dataKey": primary_metric,
                "labelKey": lbl,
                "aggregation": "sum",
                "insights": f"Represents contribution distribution of {primary_metric} across {lbl} segments."
            })
            
    # Fallback if seen_label_keys is empty
    if not charts:
        for dim in all_dims[:2]:
            lbl_lower = dim.lower()
            if lbl_lower not in seen_label_keys:
                seen_label_keys.add(lbl_lower)
                charts.append({
                    "id": f"chart_registry_fallback_{lbl_lower}",
                    "type": "bar",
                    "title": f"{primary_metric} Breakdown by {dim}",
                    "dataKey": primary_metric,
                    "labelKey": dim,
                    "aggregation": "sum",
                    "insights": "Compares performance metrics across categories."
                })
                
    return charts
