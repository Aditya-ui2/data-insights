import re
from typing import List, Dict, Any, Tuple
from analytics.schema.semantic_resolver import SemanticResolver

def classify_dataset_schema(headers: List[str], column_types: Dict[str, str], rows: List[Dict[str, Any]], client = None) -> Dict[str, str]:
    """
    Detects the dimension/metric schema mapping for all headers in the dataset using the SemanticResolver.
    """
    resolver = SemanticResolver(client)
    _, schema_map = resolver.resolve_columns_batch(headers, column_types, rows)
    return schema_map
