from typing import List, Dict, Any
import pandas as pd
from analytics.dashboard.discovery_engine import DiscoveryEngine
from analytics.dashboard.plugins import PluginManager

def select_charts(headers: List[str], schema_map: Dict[str, str], column_types: Dict[str, str],
                  df: pd.DataFrame = None, client = None,
                  canonical_mapping: Dict[str, dict] = None) -> List[Dict[str, Any]]:
    """
    Selects comprehensive chart configurations by combining domain-specific recommendations
    with recursive generic trend, cross-dimensional, and relationship discovery loops.
    """
    if df is None:
        df = pd.DataFrame(columns=headers)

    pm = PluginManager()
    plugin = pm.get_plugin(df, schema_map, client=client)
    plugin_charts = plugin.select_charts(df, schema_map, column_types)
    plugin_kpis = plugin.discover_kpis(df, schema_map)
    
    # Run continuous discovery loop to augment charts
    engine = DiscoveryEngine(df, schema_map, column_types, canonical_mapping=canonical_mapping)
    _, final_charts, _ = engine.run_discovery_loop(plugin_kpis, plugin_charts)
    
    return final_charts
