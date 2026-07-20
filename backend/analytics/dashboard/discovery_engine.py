import pandas as pd
import numpy as np
import math
from typing import List, Dict, Any, Tuple

class DiscoveryEngine:
    """
    Continuous Analytics Discovery Engine.
    Discovers measures, dimensions, hierarchies, relationships, and runs recursive discovery loops
    to generate all possible KPIs, charts, cross-analyses, and statistical insights from any dataset.
    """
    def __init__(self, df: pd.DataFrame, schema_map: Dict[str, str], column_types: Dict[str, str],
                 canonical_mapping: Dict[str, dict] = None):
        self.df = df
        self.schema_map = schema_map
        self.column_types = column_types
        self.canonical_mapping = canonical_mapping or {}
        
        # Deduce column classifications
        self.measures = []
        for col, schema in schema_map.items():
            if schema in ["revenue_metric", "cost_metric", "quantity_metric"]:
                col_lower = str(col).lower()
                # Exclude columns representing timestamps, dates, mobile numbers, or IDs
                if any(x in col_lower for x in ["timestamp", "date", "time", "mobile", "phone", "id", "roll", "number", "email", "address"]):
                    continue
                self.measures.append(col)
        self.time_cols = [col for col, schema in schema_map.items() if schema == "time_dimension"]
        self.geo_cols = [col for col, schema in schema_map.items() if schema == "geography_dimension"]
        self.cat_cols = [col for col, schema in schema_map.items() if schema == "category_dimension"]
        self.cust_cols = [col for col, schema in schema_map.items() if schema == "customer_dimension"]
        self.emp_cols = [col for col, schema in schema_map.items() if schema == "employee_dimension"]
        self.prod_cols = [col for col, schema in schema_map.items() if schema == "product_dimension"]
        self.id_cols = [col for col, schema in schema_map.items() if schema == "identifier_dimension"]
        
        self.all_dimensions = self.cat_cols + self.geo_cols + self.cust_cols + self.emp_cols + self.prod_cols + self.id_cols

    def run_discovery_loop(self, plugin_kpis: List[Dict[str, Any]], plugin_charts: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Executes continuous discovery loops until no further unique insights can be found.
        Returns (KPIs, Charts, Anomalies).
        """
        kpis = list(plugin_kpis)
        charts = list(plugin_charts)
        anomalies = []
        
        # Keep track of already visualized metrics and charts to avoid duplicates
        seen_kpis = {k.get("id") for k in kpis}
        seen_charts = set()
        for c in charts:
            sig = (c.get("dataKey"), c.get("labelKey"), c.get("aggregation"), c.get("type"))
            seen_charts.add(sig)

        # Loop 1: Automatic Base Statistical & Structural KPIs
        self._discover_structural_kpis(kpis, seen_kpis)

        # Loop 2: Comprehensive Mathematical Measures KPIs (Sum, Avg, Median, Min, Max, StdDev, Skewness, Kurtosis)
        self._discover_mathematical_kpis(kpis, seen_kpis)

        # Loop 3: Time Intelligence Trends & Growth Analysis
        self._discover_time_intelligence(charts, seen_charts)

        # Loop 4: Multi-dimensional Cross-Analysis (Aggregate all measures by all dimensions)
        self._discover_cross_analysis(charts, seen_charts)

        # Loop 5: Relationship Discovery & Segment Analysis (e.g. Employee -> Department, Branch -> Revenue)
        self._discover_relationship_charts(charts, seen_charts)

        # Loop 6: Statistical Analysis (Correlation Scatter Plots, Histograms)
        self._discover_statistical_charts(charts, seen_charts)

        # Loop 7: Outlier & Anomaly Detection (IQR, Z-Score)
        self._discover_anomalies(anomalies)

        return kpis, charts, anomalies

    def _discover_structural_kpis(self, kpis: List[Dict[str, Any]], seen_kpis: set):
        total_records = len(self.df)
        
        # Total Records KPI
        if "kpi_total_records" not in seen_kpis:
            kpis.append({
                "id": "kpi_total_records",
                "title": "Total Records Count",
                "value": total_records,
                "type": "count",
                "column": self.df.columns[0] if len(self.df.columns) > 0 else "Text",
                "description": "Total row count of the dataset"
            })
            seen_kpis.add("kpi_total_records")

        # Data Completeness KPI
        if "kpi_data_completeness" not in seen_kpis and not self.df.empty:
            total_cells = self.df.size
            null_cells = self.df.isna().sum().sum()
            completeness = ((total_cells - null_cells) / total_cells) * 100
            kpis.append({
                "id": "kpi_data_completeness",
                "title": "Data Completeness",
                "value": f"{round(completeness, 1)}%",
                "type": "percentage",
                "column": self.df.columns[0],
                "description": "Percentage of non-empty data cells"
            })
            seen_kpis.add("kpi_data_completeness")

        # Duplicate Rows count
        if "kpi_duplicate_rows" not in seen_kpis:
            dup_count = int(self.df.duplicated().sum())
            dup_pct = (dup_count / total_records) * 100 if total_records > 0 else 0.0
            kpis.append({
                "id": "kpi_duplicate_rows",
                "title": "Duplicate Records",
                "value": f"{dup_count} ({round(dup_pct, 1)}%)",
                "type": "count",
                "column": self.df.columns[0],
                "description": "Count and percentage of duplicate rows"
            })
            seen_kpis.add("kpi_duplicate_rows")

        # Unique Cardinality KPIs for top dimensions (use canonical names if available)
        for dim in self.all_dimensions[:3]:
            kpi_id = f"kpi_unique_{dim}"
            if kpi_id not in seen_kpis and dim in self.df.columns:
                unique_c = int(self.df[dim].nunique(dropna=True))
                canonical_info = self.canonical_mapping.get(dim, {})
                dim_title = canonical_info.get("canonical_name") or str(dim).replace('_', ' ').title()
                kpis.append({
                    "id": kpi_id,
                    "title": f"Unique {dim_title}",
                    "value": unique_c,
                    "type": "unique",
                    "column": dim,
                    "description": f"Total count of unique {dim_title} entries"
                })
                seen_kpis.add(kpi_id)

    def _discover_mathematical_kpis(self, kpis: List[Dict[str, Any]], seen_kpis: set):
        """
        Discovers sums and averages only (Median/StdDev are too technical for a business dashboard).
        """
        # Group columns by canonical name to detect duplicate shared canonicals
        from collections import defaultdict
        canonical_groups = defaultdict(list)
        for metric in self.measures[:5]:
            canonical_info = self.canonical_mapping.get(metric, {})
            canonical_name = canonical_info.get("canonical_name", metric)
            canonical_groups[canonical_name].append(metric)

        for metric in self.measures[:5]: # Cap at top 5 measures for core dashboard KPIs
            if metric not in self.df.columns:
                continue
            
            series = pd.to_numeric(self.df[metric], errors='coerce').dropna()
            if series.empty:
                continue
            
            # Use canonical name if available and unique, else keep original column name
            canonical_info = self.canonical_mapping.get(metric, {})
            canonical_name = canonical_info.get("canonical_name")
            if canonical_name and len(canonical_groups.get(canonical_name, [])) == 1:
                metric_title = canonical_name
            else:
                raw_title = str(metric).replace('_', ' ').strip()
                if raw_title.lower().startswith("total "):
                    metric_title = raw_title[6:].strip().title()
                else:
                    metric_title = raw_title.title()
            
            # 1. Total Sum
            kpi_sum_id = f"kpi_sum_{metric}"
            if kpi_sum_id not in seen_kpis:
                total_val = float(series.sum())
                kpis.append({
                    "id": kpi_sum_id,
                    "title": f"Total {metric_title}",
                    "value": round(total_val, 2),
                    "type": "sum",
                    "column": metric,
                    "description": f"Cumulative sum of {metric}"
                })
                seen_kpis.add(kpi_sum_id)

            # 2. Average for the first measure only
            if metric == self.measures[0]:
                kpi_avg_id = f"kpi_avg_{metric}"
                if kpi_avg_id not in seen_kpis:
                    avg_val = float(series.mean())
                    kpis.append({
                        "id": kpi_avg_id,
                        "title": f"Average {metric_title}",
                        "value": round(avg_val, 2),
                        "type": "average",
                        "column": metric,
                        "description": f"Average value of {metric}"
                    })
                    seen_kpis.add(kpi_avg_id)

    def _discover_time_intelligence(self, charts: List[Dict[str, Any]], seen_charts: set):
        """
        Discovers trends and growth rates across time dimensions.
        """
        if not self.time_cols:
            return

        # 1. Timeline count/volume trend
        for t in self.time_cols[:2]:
            sig = ("_count", t, "count", "area")
            if sig not in seen_charts:
                charts.append({
                    "id": f"chart_trend_count_{t}",
                    "type": "area",
                    "title": "Registration Trend over Time" if "registration" in str(t).lower() else "Volume Trend over Time",
                    "dataKey": t,
                    "labelKey": t,
                    "aggregation": "count",
                    "colorScheme": "default",
                    "showGrid": True,
                    "showTrendline": True,
                    "insights": f"Chronological trend of total records over date field '{t}'."
                })
                seen_charts.add(sig)

        if not self.measures:
            return

        for t in self.time_cols[:2]:
            for m in self.measures[:3]:
                # 1. Timeline Area Chart
                sig = (m, t, "sum", "area")
                if sig not in seen_charts:
                    charts.append({
                        "id": f"chart_trend_area_{t}_{m}",
                        "type": "area",
                        "title": f"{str(m).title()} Timeline Aggregations",
                        "dataKey": m,
                        "labelKey": t,
                        "aggregation": "sum",
                        "colorScheme": "default",
                        "showGrid": True,
                        "showTrendline": True,
                        "insights": f"Chronological trend of cumulative {m} over date field '{t}'."
                    })
                    seen_charts.add(sig)

                # 2. Chronological Monthly/Daily Grouped Line Chart
                sig = (m, t, "average", "line")
                if sig not in seen_charts:
                    charts.append({
                        "id": f"chart_trend_line_{t}_{m}",
                        "type": "line",
                        "title": f"Average {str(m).title()} Trajectory",
                        "dataKey": m,
                        "labelKey": t,
                        "aggregation": "average",
                        "colorScheme": "blue",
                        "showGrid": True,
                        "insights": f"Tracks average transaction values of {m} across date intervals."
                    })
                    seen_charts.add(sig)

    def _discover_cross_analysis(self, charts: List[Dict[str, Any]], seen_charts: set):
        """
        Automatically tabulates and generates charts for every dimension-measure combination.
        """
        for dim in self.all_dimensions[:4]:
            if dim not in self.df.columns:
                continue
                
            unique_count = int(self.df[dim].nunique(dropna=True)) if dim in self.df.columns else 10
            if unique_count < 2:
                continue
                
            for m in self.measures[:3]:
                # Donut Chart for small categories (proportion comparison)
                if unique_count <= 6:
                    sig = (m, dim, "sum", "donut")
                    if sig not in seen_charts:
                        charts.append({
                            "id": f"chart_donut_cross_{dim}_{m}",
                            "type": "donut",
                            "title": f"Distribution of {str(m).title()} by {str(dim).title()}",
                            "dataKey": m,
                            "labelKey": dim,
                            "aggregation": "sum",
                            "colorScheme": "cool",
                            "showLegend": True,
                            "insights": f"Proportional split breakdown of {m} across categories in '{dim}'."
                        })
                        seen_charts.add(sig)

                # Bar Chart for larger categories (value comparison)
                sig = (m, dim, "sum", "bar")
                if sig not in seen_charts:
                    charts.append({
                        "id": f"chart_bar_cross_{dim}_{m}",
                        "type": "bar",
                        "title": f"{str(m).title()} Performance by {str(dim).title()}",
                        "dataKey": m,
                        "labelKey": dim,
                        "aggregation": "sum",
                        "sortOrder": "desc",
                        "limit": 8,
                        "colorScheme": "default",
                        "insights": f"Compares cumulative sum of {m} values across top {dim} groups."
                    })
                    seen_charts.add(sig)

    def _discover_relationship_charts(self, charts: List[Dict[str, Any]], seen_charts: set):
        """
        Detects hierarchies or associations (Customer -> Revenue, Employee -> Sales)
        and outputs horizontal leaderboard charts.
        """
        # Employee Performance Leaderboards
        for emp in self.emp_cols:
            for m in self.measures[:2]:
                sig = (m, emp, "sum", "horizontal_bar")
                if sig not in seen_charts:
                    charts.append({
                        "id": f"chart_emp_leaderboard_{emp}_{m}",
                        "type": "horizontal_bar",
                        "title": f"Staff Performance Leaderboard ({str(m).title()})",
                        "dataKey": m,
                        "labelKey": emp,
                        "aggregation": "sum",
                        "sortOrder": "desc",
                        "limit": 8,
                        "colorScheme": "rainbow",
                        "insights": f"Ranks staff members in column '{emp}' by total contribution to {m}."
                    })
                    seen_charts.add(sig)

        # Customer buying concentrations
        for cust in self.cust_cols:
            for m in self.measures[:2]:
                sig = (m, cust, "sum", "horizontal_bar")
                if sig not in seen_charts:
                    charts.append({
                        "id": f"chart_cust_leaderboard_{cust}_{m}",
                        "type": "horizontal_bar",
                        "title": f"Top Client Concentrations ({str(m).title()})",
                        "dataKey": m,
                        "labelKey": cust,
                        "aggregation": "sum",
                        "sortOrder": "desc",
                        "limit": 6,
                        "colorScheme": "cool",
                        "insights": "Shows highest purchasing client accounts."
                    })
                    seen_charts.add(sig)

        # Geographical distribution
        for geo in self.geo_cols:
            for m in self.measures[:2]:
                sig = (m, geo, "sum", "bar")
                if sig not in seen_charts:
                    charts.append({
                        "id": f"chart_geo_bar_{geo}_{m}",
                        "type": "bar",
                        "title": f"Region Performance Comparison ({str(m).title()})",
                        "dataKey": m,
                        "labelKey": geo,
                        "aggregation": "sum",
                        "sortOrder": "desc",
                        "colorScheme": "warm",
                        "insights": f"Compares cumulative {m} yield across locations in '{geo}'."
                    })
                    seen_charts.add(sig)

    def _discover_statistical_charts(self, charts: List[Dict[str, Any]], seen_charts: set):
        """
        Discovers correlations, distributions, and outliers.
        """
        pass # Disabled random scatter plots to prevent mathematically incorrect analytics

    def _discover_anomalies(self, anomalies: List[Dict[str, Any]]):
        """
        Finds outliers across numeric columns using IQR rule.
        """
        for metric in self.measures:
            if metric not in self.df.columns:
                continue
            series = pd.to_numeric(self.df[metric], errors='coerce').dropna()
            if len(series) < 4:
                continue
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            outlier_series = series[(series < lower_bound) | (series > upper_bound)]
            for idx, val in outlier_series.items():
                anomalies.append({
                    "column": metric,
                    "rowNumber": int(idx) + 1,
                    "value": float(val) if isinstance(val, (float, np.float64)) else int(val),
                    "reason": f"Value {val} in column '{metric}' lies beyond statistical thresholds (IQR IQR outlier limit)."
                })
                # Cap anomalies list at 30 to avoid overflow
                if len(anomalies) >= 30:
                    return
