import pandas as pd
import numpy as np
from typing import List, Dict, Any

class BasePlugin:
    """
    Base class for all domain analytics plugins.
    """
    def __init__(self, name: str):
        self.name = name

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        """
        Return a confidence score from 0.0 to 1.0 indicating if this dataset belongs to the domain.
        """
        return 0.0

    def score_by_keywords(self, df: pd.DataFrame, keywords: List[str], norm_factor: float) -> float:
        import re
        words = set()
        for col in df.columns:
            for w in re.split(r'[^a-zA-Z0-9]', str(col).lower()):
                if w.strip():
                    words.add(w.strip())
                    
        score = 0.0
        for kw in keywords:
            if " " in kw:
                cols_joined = " ".join([str(h).lower() for h in df.columns])
                if kw in cols_joined:
                    score += 1.0
            else:
                if kw in words:
                    score += 1.0
        return min(score / norm_factor, 1.0)

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Discover and calculate domain-specific KPIs.
        """
        return []

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        """
        Generate domain-specific chart configurations.
        """
        return []

# Helper functions to safely compute aggregates in Python
def safe_sum(df: pd.DataFrame, col: str) -> float:
    try:
        val = pd.to_numeric(df[col], errors='coerce').sum()
        return round(float(val), 2) if not pd.isna(val) else 0.0
    except Exception:
        return 0.0

def safe_mean(df: pd.DataFrame, col: str) -> float:
    try:
        val = pd.to_numeric(df[col], errors='coerce').mean()
        return round(float(val), 2) if not pd.isna(val) else 0.0
    except Exception:
        return 0.0

def safe_unique(df: pd.DataFrame, col: str) -> int:
    try:
        return int(df[col].nunique(dropna=True))
    except Exception:
        return 0

# 1. Sales Plugin
class SalesPlugin(BasePlugin):
    def __init__(self):
        super().__init__("Sales")

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        keywords = ["sales", "order", "revenue", "price", "amount", "sold", "invoice", "client", "buyer", "customer"]
        return self.score_by_keywords(df, keywords, 4.0)



    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        charts = []
        rev_metrics = [c for c, s in schema_map.items() if s == "revenue_metric"]
        cust_dims = [c for c, s in schema_map.items() if s == "customer_dimension"]
        prod_dims = [c for c, s in schema_map.items() if s == "product_dimension"]
        time_dims = [c for c, s in schema_map.items() if s == "time_dimension"]
        geo_dims = [c for c, s in schema_map.items() if s == "geography_dimension"]
        cat_dims = [c for c, s in schema_map.items() if s == "category_dimension"]

        if not rev_metrics:
            return []

        m = rev_metrics[0]

        # Trend over time
        if time_dims:
            charts.append({
                "id": "sales_trend_over_time",
                "type": "area",
                "title": f"Sales Revenue Trend ({m})",
                "dataKey": m,
                "labelKey": time_dims[0],
                "aggregation": "sum",
                "colorScheme": "default",
                "insights": "Shows sales progression over time, highlighting seasonality or growth patterns."
            })

        # Product sales performance
        if prod_dims:
            charts.append({
                "id": "sales_by_product",
                "type": "bar",
                "title": f"Top Products by Revenue",
                "dataKey": m,
                "labelKey": prod_dims[0],
                "aggregation": "sum",
                "sortOrder": "desc",
                "limit": 8,
                "colorScheme": "warm",
                "insights": f"Identifies highest revenue-generating products in column '{prod_dims[0]}'."
            })

        # Customer concentration
        if cust_dims:
            charts.append({
                "id": "sales_top_customers",
                "type": "horizontal_bar",
                "title": f"Top Customers by Purchasing Volume",
                "dataKey": m,
                "labelKey": cust_dims[0],
                "aggregation": "sum",
                "sortOrder": "desc",
                "limit": 6,
                "colorScheme": "rainbow",
                "insights": "Displays key accounts contributing most to cumulative billing."
            })

        # Geo mapping if present
        if geo_dims:
            charts.append({
                "id": "sales_by_geography",
                "type": "donut",
                "title": f"Revenue Breakdown by Region",
                "dataKey": m,
                "labelKey": geo_dims[0],
                "aggregation": "sum",
                "colorScheme": "cool",
                "insights": f"Geographical distribution of sales across '{geo_dims[0]}'."
            })

        # Category sales
        if cat_dims:
            charts.append({
                "id": "sales_by_category",
                "type": "bar",
                "title": f"Revenue by Category",
                "dataKey": m,
                "labelKey": cat_dims[0],
                "aggregation": "sum",
                "colorScheme": "blue",
                "insights": "Sales contributions segmented by category classes."
            })

        # Payment Mode distribution (donut/pie chart of record counts)
        pay_mode_cols = [c for c in df.columns if "payment" in c.lower() and "mode" in c.lower()]
        if pay_mode_cols:
            pm_col = pay_mode_cols[0]
            charts.append({
                "id": "sales_payment_mode_dist",
                "type": "donut",
                "title": "Payment Mode Distribution",
                "dataKey": pm_col,
                "labelKey": pm_col,
                "aggregation": "count",
                "colorScheme": "default",
                "insights": "Percentage distribution of transactions across payment modes (Cash, Online, Udhaar)."
            })

        return charts


# 2. HR Plugin
class HRPlugin(BasePlugin):
    def __init__(self):
        super().__init__("HR")

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        keywords = ["employee", "staff", "salary", "attendance", "attrition", "hire", "leave", "karmachari", "department"]
        return self.score_by_keywords(df, keywords, 3.0)

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        kpis = []
        emp_dims = [c for c, s in schema_map.items() if s == "employee_dimension"]
        rev_metrics = [c for c, s in schema_map.items() if s == "revenue_metric"] # mapped salaries
        cat_dims = [c for c, s in schema_map.items() if s == "category_dimension"]

        # Total Headcount
        headcount_col = emp_dims[0] if emp_dims else (df.columns[0] if len(df.columns) > 0 else "Employee")
        kpis.append({
            "id": "hr_total_headcount",
            "title": "Total Headcount",
            "value": safe_unique(df, headcount_col) if emp_dims else len(df),
            "type": "count",
            "column": headcount_col,
            "description": "Total active workers/employees"
        })

        # Average Salary Spend
        salary_cols = [c for c in df.columns if "salary" in c.lower() or "pay" in c.lower() or c in rev_metrics]
        if salary_cols:
            kpis.append({
                "id": "hr_avg_salary",
                "title": "Average Employee Salary",
                "value": safe_mean(df, salary_cols[0]),
                "type": "average",
                "column": salary_cols[0],
                "description": "Average salary across all employees"
            })
            
            kpis.append({
                "id": "hr_total_salary_budget",
                "title": "Total Monthly Salary Budget",
                "value": safe_sum(df, salary_cols[0]),
                "type": "sum",
                "column": salary_cols[0],
                "description": "Total salary expense footprint"
            })

        # Attrition Rate
        attr_cols = [c for c in df.columns if "attrition" in c.lower() or "left" in c.lower() or "status" in c.lower()]
        if attr_cols:
            attr_series = df[attr_cols[0]].astype(str).str.lower().str.strip()
            total = len(attr_series)
            left = attr_series.isin(["yes", "terminated", "left", "inactive"]).sum()
            rate = (left / total) * 100 if total > 0 else 0.0
            kpis.append({
                "id": "hr_attrition_rate",
                "title": "Employee Attrition Rate",
                "value": f"{round(rate, 2)}%",
                "type": "percentage",
                "column": attr_cols[0],
                "description": "Percentage of workforce that departed"
            })

        return kpis

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        charts = []
        emp_dims = [c for c, s in schema_map.items() if s == "employee_dimension"]
        cat_dims = [c for c, s in schema_map.items() if s == "category_dimension"]
        rev_metrics = [c for c, s in schema_map.items() if s == "revenue_metric"]

        salary_col = next((c for c in df.columns if "salary" in c.lower() or "pay" in c.lower()), None)
        if not salary_col and rev_metrics:
            salary_col = rev_metrics[0]

        # Employees by Department
        dept_col = next((c for c in df.columns if "dept" in c.lower() or "department" in c.lower() or "vertical" in c.lower()), None)
        if not dept_col and cat_dims:
            dept_col = cat_dims[0]

        if dept_col:
            charts.append({
                "id": "hr_headcount_by_dept",
                "type": "donut",
                "title": f"Headcount by Department ({dept_col})",
                "dataKey": dept_col,
                "labelKey": dept_col,
                "aggregation": "count",
                "colorScheme": "default",
                "insights": "Shows organizational breakdown and sizing per department."
            })

            if salary_col:
                charts.append({
                    "id": "hr_salary_by_dept",
                    "type": "bar",
                    "title": f"Salary Budget Distribution by Department",
                    "dataKey": salary_col,
                    "labelKey": dept_col,
                    "aggregation": "sum",
                    "colorScheme": "cool",
                    "insights": "Compares cumulative salary expenditure across business verticals."
                })

        # Salary Distribution Box plot representation
        if salary_col and emp_dims:
            charts.append({
                "id": "hr_salary_by_employee",
                "type": "horizontal_bar",
                "title": f"Top Earners / Salary Compensation",
                "dataKey": salary_col,
                "labelKey": emp_dims[0],
                "aggregation": "sum",
                "sortOrder": "desc",
                "limit": 8,
                "colorScheme": "rainbow",
                "insights": "Identifies highest paid employees or contractors."
            })

        # Role Distribution
        role_col = next((c for c in df.columns if "role" in c.lower() or "designation" in c.lower() or "title" in c.lower()), None)
        if role_col:
            charts.append({
                "id": "hr_role_distribution",
                "type": "bar",
                "title": f"Headcount by Designation/Role",
                "dataKey": role_col,
                "labelKey": role_col,
                "aggregation": "count",
                "sortOrder": "desc",
                "limit": 6,
                "colorScheme": "warm",
                "insights": "Overview of structural headcount configuration by job title."
            })

        return charts


# 3. Finance Plugin
class FinancePlugin(BasePlugin):
    def __init__(self):
        super().__init__("Finance")

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        keywords = ["expense", "income", "cost", "tax", "budget", "profit", "ledger", "loss", "faida", "kharch", "balance"]
        return self.score_by_keywords(df, keywords, 3.0)

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        kpis = []
        rev_metrics = [c for c, s in schema_map.items() if s == "revenue_metric"]
        cost_metrics = [c for c, s in schema_map.items() if s == "cost_metric"]

        total_rev = 0.0
        total_cost = 0.0

        if rev_metrics:
            row_revs = df[rev_metrics].apply(pd.to_numeric, errors='coerce').fillna(0).sum(axis=1)
            total_rev = round(float(row_revs.sum()), 2)
            kpis.append({
                "id": "fin_total_revenue",
                "title": "Total Financial Revenue",
                "value": total_rev,
                "type": "sum",
                "column": rev_metrics[0],
                "description": "Total gross income / revenue inflows across all categories"
            })

        if cost_metrics:
            row_costs = df[cost_metrics].apply(pd.to_numeric, errors='coerce').fillna(0).sum(axis=1)
            total_cost = round(float(row_costs.sum()), 2)
            kpis.append({
                "id": "fin_total_expense",
                "title": "Total Operating Expenses",
                "value": total_cost,
                "type": "sum",
                "column": cost_metrics[0],
                "description": "Total gross expenses / cash outflows across all categories"
            })

        # Net Profit & Profit Margin
        if rev_metrics and cost_metrics:
            net_profit = total_rev - total_cost
            kpis.append({
                "id": "fin_net_profit",
                "title": "Net Business Profit",
                "value": round(net_profit, 2),
                "type": "sum",
                "column": rev_metrics[0],
                "description": "Gross Revenue minus Gross Expenses"
            })
            
            margin = (net_profit / total_rev) * 100 if total_rev > 0 else 0.0
            kpis.append({
                "id": "fin_net_margin",
                "title": "Net Profit Margin (%)",
                "value": f"{round(margin, 2)}%",
                "type": "percentage",
                "column": rev_metrics[0],
                "description": "Gross margin ratio representing profitability efficiency"
            })

        return kpis

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        charts = []
        rev_metrics = [c for c, s in schema_map.items() if s == "revenue_metric"]
        cost_metrics = [c for c, s in schema_map.items() if s == "cost_metric"]
        time_dims = [c for c, s in schema_map.items() if s == "time_dimension"]
        cat_dims = [c for c, s in schema_map.items() if s == "category_dimension"]

        # Trend over time (Profitability timeline)
        if time_dims and rev_metrics:
            charts.append({
                "id": "fin_revenue_trend",
                "type": "line",
                "title": "Revenue Performance Trend",
                "dataKey": rev_metrics[0],
                "labelKey": time_dims[0],
                "aggregation": "sum",
                "colorScheme": "default",
                "insights": "Plots income growth vector chronologically."
            })

        # Expense Breakdown by category
        expense_col = cost_metrics[0] if cost_metrics else None
        cat_col = next((c for c in df.columns if "category" in c.lower() or "type" in c.lower()), None)
        if not cat_col and cat_dims:
            cat_col = cat_dims[0]

        if expense_col and cat_col:
            charts.append({
                "id": "fin_expense_breakdown",
                "type": "donut",
                "title": f"Expense Breakdown by {str(cat_col).title()}",
                "dataKey": expense_col,
                "labelKey": cat_col,
                "aggregation": "sum",
                "colorScheme": "warm",
                "insights": f"Breaks down spending categories to identify key cost centers."
            })

        # Revenue vs Expense Comparison (Combo view)
        if rev_metrics and cost_metrics and time_dims:
            charts.append({
                "id": "fin_rev_vs_exp",
                "type": "bar",
                "title": "Revenue vs Operating Expense Trend",
                "dataKey": rev_metrics[0],
                "labelKey": time_dims[0],
                "aggregation": "sum",
                "colorScheme": "cool",
                "insights": "Compares cash inflows against outflows side-by-side over time."
            })
        # Payment Mode distribution (donut/pie chart of record counts)
        pay_mode_cols = [c for c in df.columns if "payment" in c.lower() and "mode" in c.lower()]
        if pay_mode_cols:
            pm_col = pay_mode_cols[0]
            charts.append({
                "id": "fin_payment_mode_dist",
                "type": "donut",
                "title": "Payment Mode Distribution",
                "dataKey": pm_col,
                "labelKey": pm_col,
                "aggregation": "count",
                "colorScheme": "default",
                "insights": "Percentage distribution of transactions across payment modes (Cash, Online, Udhaar)."
            })

        return charts


# 4. Inventory Plugin
class InventoryPlugin(BasePlugin):
    def __init__(self):
        super().__init__("Inventory")

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        keywords = ["stock", "inventory", "warehouse", "product", "sku", "qty", "item", "quantity_on_hand", "stock_value"]
        return self.score_by_keywords(df, keywords, 3.0)

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        kpis = []
        qty_metrics = [c for c, s in schema_map.items() if s == "quantity_metric"]
        prod_dims = [c for c, s in schema_map.items() if s == "product_dimension"]
        rev_metrics = [c for c, s in schema_map.items() if s == "revenue_metric"] # mapped cost/prices

        # Total SKUs
        sku_col = prod_dims[0] if prod_dims else (df.columns[0] if len(df.columns) > 0 else "Product")
        kpis.append({
            "id": "inv_total_skus",
            "title": "Total Unique SKUs / Products",
            "value": safe_unique(df, sku_col),
            "type": "unique",
            "column": sku_col,
            "description": "Total catalog size of unique items"
        })

        # Stock Volume
        if qty_metrics:
            kpis.append({
                "id": "inv_total_stock_vol",
                "title": "Total Stock On Hand (Qty)",
                "value": int(safe_sum(df, qty_metrics[0])),
                "type": "sum",
                "column": qty_metrics[0],
                "description": "Total inventory volume sum"
            })

        # Total Inventory Valuation
        val_col = next((c for c in df.columns if "val" in c.lower() or "cost" in c.lower() or "price" in c.lower()), None)
        if not val_col and rev_metrics:
            val_col = rev_metrics[0]

        if val_col and qty_metrics:
            # Valuation = Sum(Qty * Cost)
            try:
                valuation = (df[qty_metrics[0]].fillna(0) * df[val_col].fillna(0)).sum()
                kpis.append({
                    "id": "inv_valuation",
                    "title": "Total Inventory Value",
                    "value": round(float(valuation), 2),
                    "type": "sum",
                    "column": val_col,
                    "description": "Total catalog valuation based on unit cost and quantity on hand"
                })
            except Exception:
                pass

        return kpis

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        charts = []
        qty_metrics = [c for c, s in schema_map.items() if s == "quantity_metric"]
        prod_dims = [c for c, s in schema_map.items() if s == "product_dimension"]
        geo_dims = [c for c, s in schema_map.items() if s == "geography_dimension"] # warehouse locations

        qty_col = qty_metrics[0] if qty_metrics else None
        prod_col = prod_dims[0] if prod_dims else None

        # Stock levels by product
        if qty_col and prod_col:
            charts.append({
                "id": "inv_stock_by_product",
                "type": "bar",
                "title": "Inventory Stock Levels by Product Name",
                "dataKey": qty_col,
                "labelKey": prod_col,
                "aggregation": "sum",
                "sortOrder": "desc",
                "limit": 8,
                "colorScheme": "default",
                "insights": "Shows stock count availability per product class."
            })

        # Warehouse distribution
        wh_col = next((c for c in df.columns if "warehouse" in c.lower() or "store" in c.lower() or "location" in c.lower()), None)
        if not wh_col and geo_dims:
            wh_col = geo_dims[0]

        if wh_col and qty_col:
            charts.append({
                "id": "inv_by_warehouse",
                "type": "donut",
                "title": f"Stock Distribution by Warehouse ({wh_col})",
                "dataKey": qty_col,
                "labelKey": wh_col,
                "aggregation": "sum",
                "colorScheme": "cool",
                "insights": "Identifies geographic storage concentrations."
            })

        return charts


# 5. Healthcare Plugin
class HealthcarePlugin(BasePlugin):
    def __init__(self):
        super().__init__("Healthcare")

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        keywords = ["patient", "doctor", "admission", "admit", "diagnosis", "discharge", "ward", "clinic", "hospital", "patient_id"]
        return self.score_by_keywords(df, keywords, 2.0)

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        kpis = []
        pat_cols = [c for c in df.columns if "patient" in c.lower() or "pat_" in c.lower() or "id" in c.lower()]
        doc_cols = [c for c in df.columns if "doctor" in c.lower() or "doc_" in c.lower() or "physician" in c.lower()]
        billing_cols = [c for c, s in schema_map.items() if s == "revenue_metric"]

        # Total Patients
        patient_col = pat_cols[0] if pat_cols else df.columns[0]
        kpis.append({
            "id": "hc_total_patients",
            "title": "Total Patient Admissions",
            "value": safe_unique(df, patient_col) if pat_cols else len(df),
            "type": "count",
            "column": patient_col,
            "description": "Total unique patients registered or admitted"
        })

        # Total Doctors
        if doc_cols:
            kpis.append({
                "id": "hc_total_doctors",
                "title": "Active Physicians / Doctors",
                "value": safe_unique(df, doc_cols[0]),
                "type": "unique",
                "column": doc_cols[0],
                "description": "Unique medical officers assigned to cases"
            })

        # Avg Billing
        if billing_cols:
            kpis.append({
                "id": "hc_total_billing",
                "title": "Cumulative Hospital Billing Value",
                "value": safe_sum(df, billing_cols[0]),
                "type": "sum",
                "column": billing_cols[0],
                "description": "Total medical billing receivables"
            })
            
            kpis.append({
                "id": "hc_avg_patient_bill",
                "title": "Average Bill per Admission",
                "value": safe_mean(df, billing_cols[0]),
                "type": "average",
                "column": billing_cols[0],
                "description": "Average transaction value per patient"
            })

        # Average Length of Stay
        stay_cols = [c for c in df.columns if "stay" in c.lower() or "days" in c.lower() or "duration" in c.lower()]
        if stay_cols:
            kpis.append({
                "id": "hc_avg_stay_days",
                "title": "Average Length of Stay (Days)",
                "value": safe_mean(df, stay_cols[0]),
                "type": "average",
                "column": stay_cols[0],
                "description": "Average duration in hospital ward"
            })

        return kpis

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        charts = []
        time_dims = [c for c, s in schema_map.items() if s == "time_dimension"]
        doc_cols = [c for c in df.columns if "doctor" in c.lower() or "doc_" in c.lower() or "physician" in c.lower()]
        diag_cols = [c for c in df.columns if "diagnosis" in c.lower() or "disease" in c.lower() or "symptom" in c.lower() or "condition" in c.lower()]
        ward_cols = [c for c in df.columns if "ward" in c.lower() or "room" in c.lower() or "dept" in c.lower() or "department" in c.lower()]
        billing_cols = [c for c, s in schema_map.items() if s == "revenue_metric"]

        # Admissions trend over time
        if time_dims:
            charts.append({
                "id": "hc_admission_trend",
                "type": "line",
                "title": "Patient Admissions Rate Trend",
                "dataKey": df.columns[0],
                "labelKey": time_dims[0],
                "aggregation": "count",
                "colorScheme": "default",
                "insights": "Displays patient registration counts chronologically."
            })

        # Patients by Ward
        ward_col = ward_cols[0] if ward_cols else None
        if ward_col:
            charts.append({
                "id": "hc_patients_by_ward",
                "type": "donut",
                "title": "Patient Distribution by Ward",
                "dataKey": ward_col,
                "labelKey": ward_col,
                "aggregation": "count",
                "colorScheme": "cool",
                "insights": "Shows ward capacity loads."
            })

        # Diagnosis categories
        diag_col = diag_col = diag_cols[0] if diag_cols else None
        if diag_col:
            charts.append({
                "id": "hc_cases_by_diagnosis",
                "type": "bar",
                "title": "Common Case Diagnoses Breakdown",
                "dataKey": diag_col,
                "labelKey": diag_col,
                "aggregation": "count",
                "sortOrder": "desc",
                "limit": 8,
                "colorScheme": "warm",
                "insights": "Aggregates medical case files by diagnostic classification."
            })

        # Doctor Patient Loads
        if doc_cols:
            charts.append({
                "id": "hc_doc_loads",
                "type": "horizontal_bar",
                "title": "Top Doctors by Assigned Patient Load",
                "dataKey": doc_cols[0],
                "labelKey": doc_cols[0],
                "aggregation": "count",
                "sortOrder": "desc",
                "limit": 6,
                "colorScheme": "rainbow",
                "insights": "Shows patient distribution across physician staff."
            })

        # Billing by Ward if both available
        if billing_cols and ward_col:
            charts.append({
                "id": "hc_billing_by_ward",
                "type": "bar",
                "title": "Total Billing Revenue by Ward Category",
                "dataKey": billing_cols[0],
                "labelKey": ward_col,
                "aggregation": "sum",
                "colorScheme": "blue",
                "insights": "Identifies high-value hospital cost/billing centers."
            })

        return charts


# 6. Marketing Plugin
class MarketingPlugin(BasePlugin):
    def __init__(self):
        super().__init__("Marketing")

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        keywords = ["campaign", "clicks", "impressions", "spend", "ctr", "cpc", "cpa", "roi", "ad_", "leads"]
        return self.score_by_keywords(df, keywords, 3.0)

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        kpis = []
        spend_cols = [c for c in df.columns if "spend" in c.lower() or "cost" in c.lower() or "budget" in c.lower()]
        click_cols = [c for c in df.columns if "click" in c.lower()]
        imp_cols = [c for c in df.columns if "impression" in c.lower() or "view" in c.lower()]
        conv_cols = [c for c in df.columns if "conversion" in c.lower() or "lead" in c.lower() or "sale" in c.lower()]

        # Ad Spend
        if spend_cols:
            kpis.append({
                "id": "mkt_total_spend",
                "title": "Total Campaign Ad Spend",
                "value": safe_sum(df, spend_cols[0]),
                "type": "sum",
                "column": spend_cols[0],
                "description": "Total ad dollars spent"
            })

        # Clicks
        if click_cols:
            kpis.append({
                "id": "mkt_total_clicks",
                "title": "Total Campaign Clicks",
                "value": int(safe_sum(df, click_cols[0])),
                "type": "sum",
                "column": click_cols[0],
                "description": "Total clicked connections generated"
            })

        # CTR (Clicks / Impressions)
        if click_cols and imp_cols:
            total_clicks = safe_sum(df, click_cols[0])
            total_imps = safe_sum(df, imp_cols[0])
            ctr = (total_clicks / total_imps) * 100 if total_imps > 0 else 0.0
            kpis.append({
                "id": "mkt_ctr",
                "title": "Average Click-Through Rate (CTR)",
                "value": f"{round(ctr, 3)}%",
                "type": "percentage",
                "column": click_cols[0],
                "description": "Ratio of clicks to total visual impressions"
            })

        # Conversions
        if conv_cols:
            kpis.append({
                "id": "mkt_total_conversions",
                "title": "Total Conversions/Leads",
                "value": int(safe_sum(df, conv_cols[0])),
                "type": "sum",
                "column": conv_cols[0],
                "description": "Total successfully converted action goals"
            })

            if spend_cols:
                total_spend = safe_sum(df, spend_cols[0])
                total_convs = safe_sum(df, conv_cols[0])
                cpa = total_spend / total_convs if total_convs > 0 else 0.0
                kpis.append({
                    "id": "mkt_cpa",
                    "title": "Cost Per Acquisition (CPA)",
                    "value": round(cpa, 2),
                    "type": "average",
                    "column": spend_cols[0],
                    "description": "Average spending required to generate a conversion"
                })

        return kpis

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        charts = []
        camp_cols = [c for c in df.columns if "campaign" in c.lower() or "ad_name" in c.lower() or "channel" in c.lower() or "platform" in c.lower()]
        spend_cols = [c for c in df.columns if "spend" in c.lower() or "cost" in c.lower()]
        click_cols = [c for c in df.columns if "click" in c.lower()]
        time_dims = [c for c, s in schema_map.items() if s == "time_dimension"]

        spend_col = spend_cols[0] if spend_cols else None
        camp_col = camp_cols[0] if camp_cols else None

        # Spend by Platform / Campaign
        if spend_col and camp_col:
            charts.append({
                "id": "mkt_spend_by_platform",
                "type": "bar",
                "title": f"Ad Spend by Campaign/Platform",
                "dataKey": spend_col,
                "labelKey": camp_col,
                "aggregation": "sum",
                "sortOrder": "desc",
                "colorScheme": "default",
                "insights": "Compares cost allocations across platforms."
            })

        # Clicks Trend over time
        if click_cols and time_dims:
            charts.append({
                "id": "mkt_clicks_trend",
                "type": "line",
                "title": "Ad Click Engagement Trend",
                "dataKey": click_cols[0],
                "labelKey": time_dims[0],
                "aggregation": "sum",
                "colorScheme": "cool",
                "insights": "Tracks ad campaign engagement trajectory over time."
            })

        # CTR comparison by Campaign
        if click_cols and camp_col:
            charts.append({
                "id": "mkt_clicks_by_campaign",
                "type": "donut",
                "title": "Clicks Share by Campaign Category",
                "dataKey": click_cols[0],
                "labelKey": camp_col,
                "aggregation": "sum",
                "colorScheme": "warm",
                "insights": "Proportion breakdown of traffic share by source."
            })

        return charts


# 7. Manufacturing Plugin
class ManufacturingPlugin(BasePlugin):
    def __init__(self):
        super().__init__("Manufacturing")

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        keywords = ["machine", "downtime", "defect", "output", "produced", "batch", "operator", "line", "factory", "units_produced"]
        return self.score_by_keywords(df, keywords, 2.0)

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        kpis = []
        out_cols = [c for c in df.columns if "output" in c.lower() or "produced" in c.lower() or "units" in c.lower() or "yield" in c.lower()]
        down_cols = [c for c in df.columns if "downtime" in c.lower() or "stop" in c.lower() or "delay" in c.lower()]
        def_cols = [c for c in df.columns if "defect" in c.lower() or "reject" in c.lower() or "waste" in c.lower()]

        # Total output
        if out_cols:
            kpis.append({
                "id": "mfg_total_output",
                "title": "Total Production Output",
                "value": int(safe_sum(df, out_cols[0])),
                "type": "sum",
                "column": out_cols[0],
                "description": "Total units produced across lines"
            })

        # Total Downtime
        if down_cols:
            kpis.append({
                "id": "mfg_total_downtime",
                "title": "Total Machine Downtime (Hrs/Mins)",
                "value": safe_sum(df, down_cols[0]),
                "type": "sum",
                "column": down_cols[0],
                "description": "Cumulative machinery stoppage duration"
            })

        # Defect Rate
        if def_cols and out_cols:
            defects = safe_sum(df, def_cols[0])
            total = safe_sum(df, out_cols[0])
            rate = (defects / total) * 100 if total > 0 else 0.0
            kpis.append({
                "id": "mfg_defect_rate",
                "title": "Average Defect Rate (%)",
                "value": f"{round(rate, 2)}%",
                "type": "percentage",
                "column": def_cols[0],
                "description": "Ratio of defective outputs to total produced"
            })

        return kpis

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        charts = []
        mach_cols = [c for c in df.columns if "machine" in c.lower() or "line" in c.lower() or "station" in c.lower()]
        out_cols = [c for c in df.columns if "output" in c.lower() or "produced" in c.lower()]
        down_cols = [c for c in df.columns if "downtime" in c.lower()]
        time_dims = [c for c, s in schema_map.items() if s == "time_dimension"]

        mach_col = mach_cols[0] if mach_cols else None
        out_col = out_cols[0] if out_cols else None

        # Machine Output Yield
        if out_col and mach_col:
            charts.append({
                "id": "mfg_output_by_machine",
                "type": "bar",
                "title": "Production Yield output by Machine Line",
                "dataKey": out_col,
                "labelKey": mach_col,
                "aggregation": "sum",
                "sortOrder": "desc",
                "colorScheme": "default",
                "insights": "Compares productivity levels between machines."
            })

        # Downtime comparison
        if down_cols and mach_col:
            charts.append({
                "id": "mfg_downtime_by_machine",
                "type": "horizontal_bar",
                "title": "Machine Downtime Stoppage Hours",
                "dataKey": down_cols[0],
                "labelKey": mach_col,
                "aggregation": "sum",
                "sortOrder": "desc",
                "colorScheme": "warm",
                "insights": "Identifies machinery lines causing most operational latency."
            })

        # Yield trend over time
        if out_col and time_dims:
            charts.append({
                "id": "mfg_yield_trend",
                "type": "line",
                "title": "Weekly Production Output Yield",
                "dataKey": out_col,
                "labelKey": time_dims[0],
                "aggregation": "sum",
                "colorScheme": "cool",
                "insights": "Visualizes production consistency trajectory."
            })

        return charts


# 8. Education Plugin
class EducationPlugin(BasePlugin):
    def __init__(self):
        super().__init__("Education")

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        keywords = ["student", "marks", "score", "grade", "teacher", "course", "subject", "attendance_pct", "passing_marks"]
        return self.score_by_keywords(df, keywords, 2.0)

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        kpis = []
        stud_cols = [c for c in df.columns if "student" in c.lower() or "roll" in c.lower() or "id" in c.lower()]
        score_cols = [c for c in df.columns if "marks" in c.lower() or "score" in c.lower() or "grade" in c.lower()]

        # Total Students
        student_col = stud_cols[0] if stud_cols else df.columns[0]
        kpis.append({
            "id": "edu_total_students",
            "title": "Total Enrolled Students",
            "value": safe_unique(df, student_col) if stud_cols else len(df),
            "type": "count",
            "column": student_col,
            "description": "Total unique student records"
        })

        # Average Class Score
        if score_cols:
            kpis.append({
                "id": "edu_avg_score",
                "title": "Average Exam Score",
                "value": safe_mean(df, score_cols[0]),
                "type": "average",
                "column": score_cols[0],
                "description": "Average test score across cohort"
            })

        # Pass Rate % (Assuming passing threshold is 40)
        if score_cols:
            try:
                scores = pd.to_numeric(df[score_cols[0]], errors='coerce').dropna()
                if not scores.empty:
                    passed = (scores >= 40).sum()
                    rate = (passed / len(scores)) * 100
                    kpis.append({
                        "id": "edu_passing_rate",
                        "title": "Cohort Passing Rate (%)",
                        "value": f"{round(rate, 2)}%",
                        "type": "percentage",
                        "column": score_cols[0],
                        "description": "Percentage of students scoring >= 40 marks"
                    })
            except Exception:
                pass

        return kpis

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        charts = []
        score_cols = [c for c in df.columns if "marks" in c.lower() or "score" in c.lower()]
        subject_cols = [c for c in df.columns if "subject" in c.lower() or "course" in c.lower() or "class" in c.lower()]
        grade_cols = [c for c in df.columns if "grade" in c.lower() or "division" in c.lower()]

        score_col = score_cols[0] if score_cols else None
        subj_col = subject_cols[0] if subject_cols else None

        # Scores by Subject
        if score_col and subj_col:
            charts.append({
                "id": "edu_scores_by_subject",
                "type": "bar",
                "title": "Average Performance Score by Subject",
                "dataKey": score_col,
                "labelKey": subj_col,
                "aggregation": "average",
                "colorScheme": "default",
                "insights": "Compares cohort score averages across courses."
            })

        # Grade distribution
        grade_col = grade_cols[0] if grade_cols else None
        if grade_col:
            charts.append({
                "id": "edu_grades_distribution",
                "type": "donut",
                "title": "Grade Distribution Share",
                "dataKey": grade_col,
                "labelKey": grade_col,
                "aggregation": "count",
                "colorScheme": "cool",
                "insights": "Breakdown of cohort grades achievements."
            })

        return charts


# 9. Retail Plugin
class RetailPlugin(BasePlugin):
    def __init__(self):
        super().__init__("Retail")

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        keywords = ["retail", "basket", "store", "cashier", "payment_mode", "branch", "pos", "discount_pct", "item_price"]
        return self.score_by_keywords(df, keywords, 2.0)

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        kpis = []
        rev_metrics = [c for c, s in schema_map.items() if s == "revenue_metric"]
        qty_metrics = [c for c, s in schema_map.items() if s == "quantity_metric"]

        if rev_metrics:
            row_revs = df[rev_metrics].apply(pd.to_numeric, errors='coerce').fillna(0).sum(axis=1)
            total_sales = round(float(row_revs.sum()), 2)
            kpis.append({
                "id": "ret_total_sales",
                "title": "Total Retail POS Sales",
                "value": total_sales,
                "type": "sum",
                "column": rev_metrics[0],
                "description": "Total cumulative retail transactions sum across all categories"
            })
            
            avg_basket = round(float(row_revs.mean()), 2)
            kpis.append({
                "id": "ret_avg_basket",
                "title": "Average Basket Spend",
                "value": avg_basket,
                "type": "average",
                "column": rev_metrics[0],
                "description": "Average checkout ticket size"
            })

        if qty_metrics:
            row_qtys = df[qty_metrics].apply(pd.to_numeric, errors='coerce').fillna(0).sum(axis=1)
            total_qty = int(row_qtys.sum())
            kpis.append({
                "id": "ret_total_volume",
                "title": "Total Retail Units Dispatched",
                "value": total_qty,
                "type": "sum",
                "column": qty_metrics[0],
                "description": "Total count of units sold in transactions across all categories"
            })

        return kpis

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        charts = []
        rev_metrics = [c for c, s in schema_map.items() if s == "revenue_metric"]
        pm_cols = [c for c in df.columns if "payment" in c.lower() or "mode" in c.lower() or "type" in c.lower() or "paisa" in c.lower()]
        branch_cols = [c for c in df.columns if "branch" in c.lower() or "store" in c.lower() or "location" in c.lower()]
        time_dims = [c for c, s in schema_map.items() if s == "time_dimension"]

        m = rev_metrics[0] if rev_metrics else None

        if not m:
            return []

        # Payment Modes Share
        if pm_cols:
            charts.append({
                "id": "ret_payment_modes",
                "type": "donut",
                "title": f"POS Sales Share by Payment Mode ({pm_cols[0]})",
                "dataKey": m,
                "labelKey": pm_cols[0],
                "aggregation": "sum",
                "colorScheme": "cool",
                "insights": "Shows split of payment choices (e.g. Cash, Card, UPI)."
            })

        # Branch performance
        if branch_cols:
            charts.append({
                "id": "ret_branch_perf",
                "type": "bar",
                "title": "POS Sales Performance by Store Branch",
                "dataKey": m,
                "labelKey": branch_cols[0],
                "aggregation": "sum",
                "sortOrder": "desc",
                "colorScheme": "default",
                "insights": "Ranks store branch revenues."
            })

        # Hourly/Daily sales trend
        if time_dims:
            charts.append({
                "id": "ret_sales_trend",
                "type": "area",
                "title": "Daily Retail POS Sales Trend",
                "dataKey": m,
                "labelKey": time_dims[0],
                "aggregation": "sum",
                "colorScheme": "warm",
                "insights": "Tracks transactional revenue patterns over days."
            })

        return charts


# 10. CRM Plugin
class CRMPlugin(BasePlugin):
    def __init__(self):
        super().__init__("CRM")

    def score_dataset(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> float:
        keywords = ["lead", "pipeline", "stage", "conversion", "win_rate", "crm", "sales_cycle", "opportunity", "closed_won"]
        return self.score_by_keywords(df, keywords, 2.0)

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        kpis = []
        deal_cols = [c for c, s in schema_map.items() if s == "revenue_metric"]
        stage_cols = [c for c in df.columns if "stage" in c.lower() or "status" in c.lower()]

        # Total opportunities count
        kpis.append({
            "id": "crm_total_deals",
            "title": "Total Pipeline Opportunities",
            "value": len(df),
            "type": "count",
            "column": df.columns[0] if len(df.columns) > 0 else "Opportunity",
            "description": "Total deals tracked in CRM"
        })

        # Total Pipeline Value
        if deal_cols:
            kpis.append({
                "id": "crm_pipeline_value",
                "title": "Total Pipeline Deal Value",
                "value": safe_sum(df, deal_cols[0]),
                "type": "sum",
                "column": deal_cols[0],
                "description": "Gross value of all deals in pipeline"
            })
            
            kpis.append({
                "id": "crm_avg_deal_size",
                "title": "Average Opportunity Size",
                "value": safe_mean(df, deal_cols[0]),
                "type": "average",
                "column": deal_cols[0],
                "description": "Average deal value size"
            })

        # Win Rate %
        if stage_cols:
            stages = df[stage_cols[0]].astype(str).str.lower().str.strip()
            total = len(stages)
            won = stages.isin(["won", "closed won", "closed_won", "success", "converted", "won_deal"]).sum()
            rate = (won / total) * 100 if total > 0 else 0.0
            kpis.append({
                "id": "crm_win_rate",
                "title": "CRM Deal Win Rate (%)",
                "value": f"{round(rate, 2)}%",
                "type": "percentage",
                "column": stage_cols[0],
                "description": "Ratio of closed-won opportunities to total pipeline deals"
            })

        return kpis

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        charts = []
        deal_cols = [c for c, s in schema_map.items() if s == "revenue_metric"]
        stage_cols = [c for c in df.columns if "stage" in c.lower() or "status" in c.lower()]
        owner_cols = [c for c in df.columns if "owner" in c.lower() or "manager" in c.lower() or "agent" in c.lower() or "rep" in c.lower()]

        m = deal_cols[0] if deal_cols else None
        stage_col = stage_cols[0] if stage_cols else None

        if not m:
            return []

        # Pipeline Funnel by Stage
        if stage_col:
            charts.append({
                "id": "crm_pipeline_funnel",
                "type": "bar",
                "title": "Pipeline Deal count by Sales Stage",
                "dataKey": m,
                "labelKey": stage_col,
                "aggregation": "count",
                "sortOrder": "desc",
                "colorScheme": "default",
                "insights": "Visualizes funnel drop-offs per stage classification."
            })

        # Deal Value by Owner
        owner_col = owner_cols[0] if owner_cols else None
        if owner_col:
            charts.append({
                "id": "crm_value_by_owner",
                "type": "horizontal_bar",
                "title": "Deals Pipeline Value by Owner/Agent",
                "dataKey": m,
                "labelKey": owner_col,
                "aggregation": "sum",
                "sortOrder": "desc",
                "limit": 6,
                "colorScheme": "rainbow",
                "insights": "Shows pipeline size per sales agent representative."
            })

        # Pipeline Share
        if stage_col:
            charts.append({
                "id": "crm_stage_share",
                "type": "donut",
                "title": "Pipeline Financial Value Share by Stage",
                "dataKey": m,
                "labelKey": stage_col,
                "aggregation": "sum",
                "colorScheme": "cool",
                "insights": "Proportion breakdown of pipeline value lockups."
            })

        return charts


# Generic Analytics Fallback Engine
class GenericPlugin(BasePlugin):
    def __init__(self):
        super().__init__("Generic")

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        from analytics.dashboard.kpi_registry import discover_registry_kpis
        kpis = discover_registry_kpis(df, schema_map)
        
        headers = list(df.columns)
        total_records = len(df)

        if not any(k["id"] == "kpi_total_records" for k in kpis):
            kpis.append({
                "id": "kpi_total_records",
                "title": "Total Records Count",
                "value": total_records,
                "type": "count",
                "column": headers[0] if headers else "Text",
                "description": "Total row count of the dataset"
            })

        if not df.empty and not any(k["id"] == "kpi_data_completeness" for k in kpis):
            total_cells = df.size
            null_cells = df.isna().sum().sum()
            completeness = ((total_cells - null_cells) / total_cells) * 100
            kpis.append({
                "id": "kpi_data_completeness",
                "title": "Data Completeness",
                "value": f"{round(completeness, 1)}%",
                "type": "percentage",
                "column": headers[0] if headers else "Text",
                "description": "Percentage of non-empty data cells"
            })

            dup_count = int(df.duplicated().sum())
            kpis.append({
                "id": "kpi_duplicate_rows",
                "title": "Duplicate Records",
                "value": f"{dup_count} ({round((dup_count/total_records)*100, 1)}%)" if total_records > 0 else "0 (0.0%)",
                "type": "count",
                "column": headers[0] if headers else "Text",
                "description": "Count and percentage of duplicate rows"
            })

        # Add unique counts for categorical dimensions
        cat_dims = [col for col, schema in schema_map.items() if schema in ["category_dimension", "customer_dimension", "geography_dimension"]]
        filtered_cat_dims = []
        for dim in cat_dims:
            dim_lower = str(dim).lower()
            if any(x in dim_lower for x in ["timestamp", "date", "time", "mobile", "phone"]):
                continue
            filtered_cat_dims.append(dim)

        for dim in filtered_cat_dims[:2]:
            kpi_id = f"kpi_unique_{dim}"
            if not any(k["id"] == kpi_id for k in kpis):
                kpis.append({
                    "id": kpi_id,
                    "title": f"Unique {str(dim).title()}",
                    "value": safe_unique(df, dim),
                    "type": "unique",
                    "column": dim,
                    "description": f"Unique count of {dim}"
                })

        # Add sums/averages of numerical columns
        num_metrics = [col for col, schema in schema_map.items() if schema == "revenue_metric"]
        for metric in num_metrics[:3]:
            sum_id = f"kpi_total_{metric}"
            avg_id = f"kpi_avg_{metric}"
            if not any(k["id"] == sum_id for k in kpis):
                kpis.append({
                    "id": sum_id,
                    "title": f"Total {str(metric).title()}",
                    "value": safe_sum(df, metric),
                    "type": "sum",
                    "column": metric,
                    "description": f"Cumulative sum of {metric}"
                })
            if not any(k["id"] == avg_id for k in kpis):
                kpis.append({
                    "id": avg_id,
                    "title": f"Average {str(metric).title()}",
                    "value": safe_mean(df, metric),
                    "type": "average",
                    "column": metric,
                    "description": f"Average value of {metric}"
                })

        return kpis

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        from analytics.dashboard.kpi_registry import discover_registry_charts
        charts = discover_registry_charts(df, schema_map, column_types)
        if charts:
            return charts

        # Fallback to simple generic charts if registry returns empty
        rev_metrics = [col for col, schema in schema_map.items() if schema == "revenue_metric"]
        time_dims = [col for col, schema in schema_map.items() if schema == "time_dimension"]
        cat_dims = [col for col, schema in schema_map.items() if schema in ["category_dimension", "geography_dimension", "customer_dimension"]]

        if rev_metrics:
            m = rev_metrics[0]
            if time_dims:
                charts.append({
                    "id": "gen_time_trend",
                    "type": "area",
                    "title": f"{str(m).title()} Trend over Time",
                    "dataKey": m,
                    "labelKey": time_dims[0],
                    "aggregation": "sum",
                    "colorScheme": "default",
                    "insights": "Tracks overall metric progression timeline."
                })

            if cat_dims:
                charts.append({
                    "id": "gen_cat_bar",
                    "type": "bar",
                    "title": f"{str(m).title()} by {str(cat_dims[0]).title()}",
                    "dataKey": m,
                    "labelKey": cat_dims[0],
                    "aggregation": "sum",
                    "sortOrder": "desc",
                    "limit": 8,
                    "colorScheme": "cool",
                    "insights": "Compares metric totals across key categorical groups."
                })
                
                charts.append({
                    "id": "gen_cat_pie",
                    "type": "donut",
                    "title": f"Distribution of {str(m).title()} by {str(cat_dims[0]).title()}",
                    "dataKey": m,
                    "labelKey": cat_dims[0],
                    "aggregation": "sum",
                    "colorScheme": "warm",
                    "insights": "Proportional share comparison breakdown."
                })

        # Fallback raw count charts if no numerical metric exists
        elif cat_dims:
            for dim in cat_dims[:3]:
                charts.append({
                    "id": f"gen_freq_bar_{dim}",
                    "type": "bar",
                    "title": f"Records Distribution by {str(dim).replace('_', ' ').title()}",
                    "dataKey": dim,
                    "labelKey": dim,
                    "aggregation": "count",
                    "sortOrder": "desc",
                    "limit": 8,
                    "insights": f"Item counts breakdown comparison grouped by '{dim}'."
                })

        # Payment Mode distribution (donut/pie chart of record counts)
        pay_mode_cols = [c for c in df.columns if "payment" in c.lower() and "mode" in c.lower()]
        if pay_mode_cols:
            pm_col = pay_mode_cols[0]
            charts.append({
                "id": "gen_payment_mode_dist",
                "type": "donut",
                "title": "Payment Mode Distribution",
                "dataKey": pm_col,
                "labelKey": pm_col,
                "aggregation": "count",
                "colorScheme": "default",
                "insights": "Percentage distribution of transactions across payment modes (Cash, Online, Udhaar)."
            })

        return charts


class PluginManager:
    """
    Plugin system coordinator that evaluates datasets and activates domain plugins.
    """
    def __init__(self):
        self.plugins = [
            SalesPlugin(),
            HRPlugin(),
            FinancePlugin(),
            InventoryPlugin(),
            HealthcarePlugin(),
            MarketingPlugin(),
            ManufacturingPlugin(),
            EducationPlugin(),
            RetailPlugin(),
            CRMPlugin()
        ]
        self.generic = GenericPlugin()

class DynamicAIPlugin(BasePlugin):
    """
    100% Generic & Adaptive AI Business Intelligence Plugin.
    Utilizes Gemini Flash to dynamically discover KPIs and select charts for ANY domain.
    """
    def __init__(self, client=None):
        super().__init__("DynamicAI")
        self.client = client
        self.fallback_plugin = GenericPlugin()

    def discover_kpis(self, df: pd.DataFrame, schema_map: Dict[str, str]) -> List[Dict[str, Any]]:
        if not self.client:
            return self.fallback_plugin.discover_kpis(df, schema_map)
        import json
        try:
            print("[DynamicAIPlugin] Proposing custom business KPIs using Gemini...", flush=True)
            schema_context = []
            for col, role in schema_map.items():
                non_null_samples = df[col].dropna().head(3).tolist()
                schema_context.append({
                    "columnName": col,
                    "inferredRole": role,
                    "samples": [str(x)[:30] for x in non_null_samples]
                })

            prompt = f"""
You are a senior Business Intelligence (BI) architect. Analyze the schema of this business dataset:
{json.dumps(schema_context, indent=2)}

Propose exactly 6 key performance indicators (KPIs) that are highly valuable for this specific business domain.
For each KPI, define:
1. "title": Short, clean business name (e.g. "Attrition Rate", "Fulfillment Rate", "Active Patient Count"). Use clear, professional financial terms. DO NOT use terms like "Distribution", "Details", "List", or "Group" for single total metrics (e.g. rename "Revenue Distribution" to "Total Revenue Collected").
2. "metricColumn": The numeric column to aggregate.
3. "aggregation": One of: "sum", "average", "count", "nunique".
4. "description": A short explanation of what this KPI measures.

Return ONLY a JSON list of objects matching this schema:
[
  {{
    "title": "KPI Title",
    "metricColumn": "column_name",
    "aggregation": "sum",
    "description": "Short explanation"
  }}
]
"""
            from analytics.utils.llm_client import generate_content_safe
            res_text = generate_content_safe(self.client, prompt, json_mode=True)
            proposals = json.loads(res_text)

            if isinstance(proposals, dict):
                for k, v in proposals.items():
                    if isinstance(v, list):
                        proposals = v
                        break
            if not isinstance(proposals, list):
                proposals = [proposals]

            kpis = []
            for idx, prop in enumerate(proposals):
                if not isinstance(prop, dict):
                    continue
                title = prop.get("title")
                m_col = prop.get("metricColumn")
                agg = prop.get("aggregation", "sum").lower()
                desc = prop.get("description", "")

                if m_col not in df.columns:
                    continue

                val = 0.0
                try:
                    if agg == "sum":
                        val = safe_sum(df, m_col)
                    elif agg == "average" or agg == "mean":
                        val = safe_mean(df, m_col)
                    elif agg in ["count", "nunique"]:
                        val = safe_unique(df, m_col) if agg == "nunique" else len(df[m_col].dropna())
                except:
                    pass

                kpis.append({
                    "id": f"kpi_dynamic_ai_{idx}",
                    "title": title,
                    "value": val,
                    "type": "count" if agg in ["count", "nunique"] else "currency" if agg == "sum" else "number",
                    "column": m_col,
                    "description": desc
                })
            
            if not kpis:
                print("[DynamicAIPlugin] Empty AI KPIs. Falling back to GenericPlugin.")
                return self.fallback_plugin.discover_kpis(df, schema_map)
            return kpis
        except Exception as e:
            print(f"[DynamicAIPlugin] Failed to generate dynamic KPIs: {e}. Falling back to GenericPlugin.")
            return self.fallback_plugin.discover_kpis(df, schema_map)

    def select_charts(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str]) -> List[Dict[str, Any]]:
        if not self.client:
            return self.fallback_plugin.select_charts(df, schema_map, column_types)
        import json
        try:
            print("[DynamicAIPlugin] Proposing custom business charts using Gemini...", flush=True)
            schema_context = []
            for col, role in schema_map.items():
                non_null_samples = df[col].dropna().head(3).tolist()
                schema_context.append({
                    "columnName": col,
                    "inferredRole": role,
                    "samples": [str(x)[:30] for x in non_null_samples]
                })

            prompt = f"""
You are a senior Business Intelligence (BI) architect. Analyze the schema of this business dataset:
{json.dumps(schema_context, indent=2)}

Propose exactly 4 highly meaningful chart visualizations for a dashboard (e.g. Sales by Product, Patient count by Department, Trend of Orders over Time).
CRITICAL: To ensure data diversity, each proposed chart MUST use a DIFFERENT grouping column ('labelKey'). DO NOT repeat the same 'labelKey' across charts (e.g., do not suggest multiple charts grouped by 'Customer Name').
For each chart, define:
1. "title": Short, descriptive chart title (e.g., "Monthly Deliveries Trend").
2. "type": One of: "bar", "line", "pie", "area".
3. "dataKey": The metric column name to aggregate (y-axis values).
4. "labelKey": The dimension/grouping column name (x-axis categories).
5. "aggregation": One of: "sum", "average", "count".

Return ONLY a JSON list of objects matching this schema:
[
  {{
    "title": "Chart Title",
    "type": "bar",
    "dataKey": "column_name",
    "labelKey": "dimension_name",
    "aggregation": "sum"
  }}
]
"""
            from analytics.utils.llm_client import generate_content_safe
            res_text = generate_content_safe(self.client, prompt, json_mode=True)
            proposals = json.loads(res_text)

            if isinstance(proposals, dict):
                for k, v in proposals.items():
                    if isinstance(v, list):
                        proposals = v
                        break
            if not isinstance(proposals, list):
                proposals = [proposals]

            charts = []
            seen_label_keys = set()
            for idx, prop in enumerate(proposals):
                if not isinstance(prop, dict):
                    continue
                title = prop.get("title")
                chart_type = prop.get("type", "bar").lower()
                data_key = prop.get("dataKey")
                label_key = prop.get("labelKey")
                agg = prop.get("aggregation", "sum").lower()

                if data_key not in df.columns or label_key not in df.columns:
                    continue

                if label_key in seen_label_keys:
                    continue
                seen_label_keys.add(label_key)

                charts.append({
                    "id": f"chart_dynamic_ai_{idx}",
                    "title": title,
                    "type": chart_type,
                    "dataKey": data_key,
                    "labelKey": label_key,
                    "aggregation": agg
                })
            
            if not charts:
                print("[DynamicAIPlugin] Empty AI charts. Falling back to GenericPlugin.")
                return self.fallback_plugin.select_charts(df, schema_map, column_types)
            return charts
        except Exception as e:
            print(f"[DynamicAIPlugin] Failed to generate dynamic charts: {e}. Falling back to GenericPlugin.")
            return self.fallback_plugin.select_charts(df, schema_map, column_types)


class PluginManager:
    """
    Plugin system coordinator that evaluates datasets and activates domain plugins.
    """
    def __init__(self):
        self.plugins = [
            SalesPlugin(),
            HRPlugin(),
            FinancePlugin(),
            InventoryPlugin(),
            HealthcarePlugin(),
            MarketingPlugin(),
            ManufacturingPlugin(),
            EducationPlugin(),
            RetailPlugin(),
            CRMPlugin()
        ]
        self.generic = GenericPlugin()

    def get_plugin(self, df: pd.DataFrame, schema_map: Dict[str, str], client = None) -> BasePlugin:
        """
        Evaluate dataset columns and match scores to return the best plugin.
        """
        best_plugin = self.generic
        best_score = 0.35 # Minimum confidence score threshold

        for plugin in self.plugins:
            score = plugin.score_dataset(df, schema_map)
            if score > best_score:
                best_score = score
                best_plugin = plugin

        if client and best_score < 0.65:
            print(f"[Plugin Manager] Low domain score ({best_score:.2f}). Activating Dynamic AI Plugin...", flush=True)
            return DynamicAIPlugin(client)

        print(f"[Plugin Manager] Activated Plugin: {best_plugin.name} (Score: {best_score:.2f})", flush=True)
        return best_plugin
