import pandas as pd
from typing import List, Dict, Any
from analytics.dashboard.discovery_engine import DiscoveryEngine
from analytics.dashboard.plugins import PluginManager

def detect_dataset_domain(headers: List[str]) -> str:
    """
    Detects dataset domain based on column name heuristics.
    """
    cols_joined = " ".join([str(h).lower() for h in headers])
    if any(k in cols_joined for k in ["attrition", "attendance", "employee", "staff", "salary", "salary_config", "department", "hire"]):
        return "hr"
    elif any(k in cols_joined for k in ["sales", "order", "sold", "quantity", "price", "revenue", "invoice", "client", "buyer"]):
        return "sales"
    elif any(k in cols_joined for k in ["stock", "inventory", "warehouse", "product", "sku", "qty", "item"]):
        return "inventory"
    elif any(k in cols_joined for k in ["expense", "income", "cash", "budget", "profit", "transactions"]):
        return "finance"
    elif any(k in cols_joined for k in ["lead", "conversion", "funnel", "deal", "pipeline", "crm"]):
        return "crm"
    return "generic"

def discover_kpis(df: pd.DataFrame, schema_map: Dict[str, str], client = None,
                  canonical_mapping: Dict[str, dict] = None) -> List[Dict[str, Any]]:
    """
    Delegates KPI discovery to the active domain plugin and runs the DiscoveryEngine
    recursive loop to discover all mathematically possible metrics.
    """
    pm = PluginManager()
    plugin = pm.get_plugin(df, schema_map, client=client)
    plugin_kpis = plugin.discover_kpis(df, schema_map)
    plugin_charts = plugin.select_charts(df, schema_map, {})
    
    # Run continuous discovery loop to augment KPIs
    engine = DiscoveryEngine(df, schema_map, {}, canonical_mapping=canonical_mapping)
    final_kpis, _, _ = engine.run_discovery_loop(plugin_kpis, plugin_charts)
    
    return final_kpis
