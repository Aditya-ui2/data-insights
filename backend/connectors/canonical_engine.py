import pandas as pd
from datetime import datetime
from typing import Optional, Any

class CanonicalAnalyticsEngine:
    """
    Common Analytics Engine and Dashboard Engine that works on the Canonical Model
    for every connector (including Leads, Campaigns, Contacts, Employees).
    """
    def __init__(self, client: Optional[Any] = None):
        self.client = client

    def generate_dashboard_config(self, entities_data: dict, spreadsheet_name: str) -> dict:
        """
        Generates deterministic DashboardConfig directly from canonical tables
        without using AI for field identification or classifications.
        """
        kpis = []
        charts = []
        
        # 1. Extract individual tables
        orders = entities_data.get("orders", [])
        customers = entities_data.get("customers", [])
        products = entities_data.get("products", [])
        payments = entities_data.get("payments", [])
        expenses = entities_data.get("expenses", [])
        invoices = entities_data.get("invoices", [])
        revenue = entities_data.get("revenue", [])
        leads = entities_data.get("leads", [])
        campaigns = entities_data.get("campaigns", [])
        employees = entities_data.get("employees", [])
        suppliers = entities_data.get("suppliers", [])
        
        # Convert to DataFrames
        df_orders = pd.DataFrame(orders)
        df_customers = pd.DataFrame(customers)
        df_products = pd.DataFrame(products)
        df_payments = pd.DataFrame(payments)
        df_expenses = pd.DataFrame(expenses)
        df_invoices = pd.DataFrame(invoices)
        df_revenue = pd.DataFrame(revenue)
        df_leads = pd.DataFrame(leads)
        df_campaigns = pd.DataFrame(campaigns)
        df_employees = pd.DataFrame(employees)
        df_suppliers = pd.DataFrame(suppliers)

        # ─── 2. KPI Discovery ───
        
        # Sales/Revenue Calculations
        total_rev = 0.0
        if not df_orders.empty:
            total_rev += float(df_orders["total_amount"].sum())
        elif not df_payments.empty:
            total_rev += float(df_payments["amount"].sum())
        elif not df_invoices.empty:
            total_rev += float(df_invoices["total_amount"].sum())
        elif not df_revenue.empty:
            total_rev += float(df_revenue["amount"].sum())
            
        kpis.append({
            "id": "kpi_canonical_total_revenue",
            "type": "kpi",
            "title": "Total Revenue",
            "dataKey": "total_amount",
            "value": round(total_rev, 2),
            "insights": "Total aggregated sales revenue across all transaction channels.",
            "explainability": {"calculationMethod": "sum"}
        })

        # Leads Calculations
        if not df_leads.empty:
            kpis.append({
                "id": "kpi_canonical_leads",
                "type": "kpi",
                "title": "Total Leads Generated",
                "dataKey": "id",
                "value": len(df_leads),
                "insights": "Total prospective leads tracked in CRM pipelines.",
                "explainability": {"calculationMethod": "count"}
            })
            if "status" in df_leads.columns:
                converted = df_leads[df_leads["status"].str.lower().str.contains("convert", na=False)]
                conv_rate = (len(converted) / len(df_leads)) * 100.0 if len(df_leads) > 0 else 0.0
                kpis.append({
                    "id": "kpi_canonical_lead_conversion",
                    "type": "kpi",
                    "title": "Lead Conversion Rate",
                    "dataKey": "status",
                    "value": f"{round(conv_rate, 1)}%",
                    "insights": "Percentage of sales leads converted successfully.",
                    "explainability": {"calculationMethod": "formula", "formula": "(Converted / Total) * 100"}
                })

        # Campaigns Calculations
        if not df_campaigns.empty:
            total_budget = float(df_campaigns["budget"].sum())
            total_spend = float(df_campaigns["spend"].sum())
            total_gain = float(df_campaigns["revenue_generated"].sum())
            roi = (total_gain / total_spend) if total_spend > 0 else 0.0
            
            kpis.append({
                "id": "kpi_canonical_campaign_spend",
                "type": "kpi",
                "title": "Campaign Actual Spend",
                "dataKey": "spend",
                "value": round(total_spend, 2),
                "insights": "Total marketing expenditure spent across active ads campaigns.",
                "explainability": {"calculationMethod": "sum"}
            })
            kpis.append({
                "id": "kpi_canonical_campaign_roi",
                "type": "kpi",
                "title": "Campaign ROI Multiple",
                "dataKey": "revenue_generated",
                "value": f"{round(roi, 2)}x",
                "insights": "Revenue return multiplier relative to total actual ad spend.",
                "explainability": {"calculationMethod": "formula", "formula": "Revenue / Spend"}
            })

        # Employees Calculations
        if not df_employees.empty:
            kpis.append({
                "id": "kpi_canonical_headcount",
                "type": "kpi",
                "title": "Total Staff Headcount",
                "dataKey": "id",
                "value": len(df_employees),
                "insights": "Total counts of registered active employee profiles.",
                "explainability": {"calculationMethod": "count"}
            })

        # Transaction counts
        tx_count = len(df_orders) if not df_orders.empty else (len(df_payments) if not df_payments.empty else 0)
        if tx_count > 0:
            kpis.append({
                "id": "kpi_canonical_transactions",
                "type": "kpi",
                "title": "Total Transactions",
                "dataKey": "id",
                "value": tx_count,
                "insights": "Total volume of sales transactions completed.",
                "explainability": {"calculationMethod": "count"}
            })
            kpis.append({
                "id": "kpi_canonical_aov",
                "type": "kpi",
                "title": "Average Transaction Value",
                "dataKey": "total_amount",
                "value": round(total_rev / tx_count, 2),
                "insights": "Mean checkout value per customer transaction.",
                "explainability": {"calculationMethod": "mean"}
            })

        # ─── 3. Charts Selection ───

        # Revenue Trend Chart (Area Chart)
        trend_data = []
        df_trend = None
        if not df_orders.empty:
            df_trend = df_orders.copy()
            df_trend["date"] = pd.to_datetime(df_trend["created_at"]).dt.strftime("%Y-%m-%d")
        elif not df_payments.empty:
            df_trend = df_payments.copy()
            df_trend["date"] = pd.to_datetime(df_trend["created_at"]).dt.strftime("%Y-%m-%d")

        if df_trend is not None and not df_trend.empty:
            grouped = df_trend.groupby("date").size().reset_index(name="Transactions")
            amt_col = "total_amount" if "total_amount" in df_trend.columns else ("amount" if "amount" in df_trend.columns else "")
            if amt_col:
                sums = df_trend.groupby("date")[amt_col].sum().reset_index(name="Revenue")
                grouped = pd.merge(grouped, sums, on="date")
            trend_data = grouped.sort_values("date").to_dict(orient="records")

            charts.append({
                "id": "chart_canonical_revenue_trend",
                "type": "area",
                "title": "Revenue Trend over Time",
                "dataKey": "Revenue",
                "labelKey": "date",
                "insights": "Visualizes daily or cyclical variations in total sales volume.",
                "data": trend_data
            })

        # Leads Pipeline chart
        if not df_leads.empty and "status" in df_leads.columns:
            lead_stages = df_leads.groupby("status").size().reset_index(name="Count")
            charts.append({
                "id": "chart_canonical_leads_funnel",
                "type": "bar",
                "title": "Leads by Pipeline Stage",
                "dataKey": "Count",
                "labelKey": "status",
                "insights": "Funnel analysis of prospective leads across CRM stages.",
                "data": lead_stages.to_dict(orient="records")
            })

        # Campaigns ROI breakdown
        if not df_campaigns.empty and "name" in df_campaigns.columns:
            camp_roi = df_campaigns[["name", "spend", "revenue_generated"]].copy()
            charts.append({
                "id": "chart_canonical_campaigns_performance",
                "type": "bar",
                "title": "Campaign Budgets vs Revenue",
                "dataKey": "revenue_generated",
                "labelKey": "name",
                "insights": "Comparison of spent budgets against conversions values generated.",
                "data": camp_roi.to_dict(orient="records")
            })

        # Employee departments donut chart
        if not df_employees.empty and "department" in df_employees.columns:
            dept_count = df_employees.groupby("department").size().reset_index(name="Count")
            charts.append({
                "id": "chart_canonical_employee_dept",
                "type": "donut",
                "title": "Staff Headcount by Department",
                "dataKey": "Count",
                "labelKey": "department",
                "insights": "Organizational headcount breakdown across distinct teams.",
                "data": dept_count.to_dict(orient="records")
            })

        # Expense Breakdown Chart
        if not df_expenses.empty and "category" in df_expenses.columns:
            exp_data = df_expenses.groupby("category")["amount"].sum().reset_index(name="Spend")
            charts.append({
                "id": "chart_canonical_expenses",
                "type": "horizontal_bar",
                "title": "Expense Distribution",
                "dataKey": "Spend",
                "labelKey": "category",
                "insights": "Breakdown of operating costs and outflow budgets.",
                "data": exp_data.to_dict(orient="records")
            })

        # Consolidation
        schema_map = {}
        for k in entities_data.keys():
            schema_map[k] = "canonical_table"

        dashboard_config = {
            "charts": kpis + charts,
            "anomalies": [],
            "schemaMap": schema_map,
            "canonicalMapping": {},
            "confidenceReport": {
                "overallScore": 1.0,
                "grade": "EXCELLENT",
                "details": "Predefined enterprise connector schema. Zero AI column matching errors."
            },
            "profilingStats": {
                "summary": {
                    "totalRows": tx_count or len(df_leads) or 1,
                    "totalColumns": len(entities_data),
                    "duplicateRows": 0,
                    "datatypeDistribution": {"canonical": len(entities_data)}
                }
            }
        }

        # ─── 4. AI Summary Insights Generation ───
        if self.client:
            from analytics.insights.insight_generator import generate_dashboard_insights
            try:
                res_config = generate_dashboard_insights(dashboard_config, spreadsheet_name, self.client)
                dashboard_config["summary"] = res_config.get("summary", "Analysis completed successfully.")
                dashboard_config["recommendations"] = res_config.get("recommendations", [])
            except Exception as e:
                print(f"[Canonical Engine Insights] LLM summary failed: {e}")
                dashboard_config["summary"] = f"Total revenue generated is {total_rev}."
                dashboard_config["recommendations"] = ["Optimize campaign ad budgets based on conversions ROI performance."]
        else:
            dashboard_config["summary"] = f"Total sales revenue is {total_rev}."
            dashboard_config["recommendations"] = ["Optimize campaign ad budgets based on conversions ROI performance."]

        return dashboard_config
