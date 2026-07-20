import json
import os
import threading
from typing import Dict, List, Optional, Tuple

_DEFAULT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fields.json")


class BusinessDictionary:
    """
    Central Business Dictionary that maps raw column names to canonical business fields.
    Supports exact, fuzzy, and AI semantic matching with confidence scoring.
    Grows automatically as new aliases are confirmed by users.
    """

    def __init__(self, path: Optional[str] = None):
        self.path = path or _DEFAULT_PATH
        self._lock = threading.Lock()
        self._fields: Dict[str, dict] = {}
        self._alias_to_canonical: Dict[str, str] = {}
        self._load()

    def _load(self):
        if not os.path.exists(self.path):
            self._fields = {}
            self._alias_to_canonical = {}
            return
        with open(self.path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self._fields = {}
        self._alias_to_canonical = {}
        for key, field in data.items():
            canonical = field["canonical_name"]
            self._fields[key] = field
            for alias in field.get("aliases", []):
                normalized = self._normalize(alias)
                if normalized and normalized not in self._alias_to_canonical:
                    self._alias_to_canonical[normalized] = key

    def save(self):
        with self._lock:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            data = {}
            for key, field in self._fields.items():
                data[key] = {
                    "canonical_name": field["canonical_name"],
                    "category": field["category"],
                    "description": field.get("description", ""),
                    "dashboard_priority": field.get("dashboard_priority", 0),
                    "aliases": field.get("aliases", [])
                }
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

    def reload(self):
        self._load()

    @staticmethod
    def _normalize(text: str) -> str:
        text = text.lower().strip()
        text = text.replace("_", " ").replace("-", " ").replace(".", "")
        text = " ".join(text.split())
        return text

    def add_alias(self, canonical_key: str, new_alias: str) -> bool:
        normalized = self._normalize(new_alias)
        if not normalized:
            return False
        if normalized in self._alias_to_canonical:
            return False
        if canonical_key not in self._fields:
            return False
        with self._lock:
            if normalized in self._alias_to_canonical:
                return False
            self._fields[canonical_key].setdefault("aliases", []).append(new_alias)
            self._alias_to_canonical[normalized] = canonical_key
        self.save()
        return True

    def exact_match(self, column_name: str) -> Optional[Tuple[str, str, float]]:
        normalized = self._normalize(column_name)
        if not normalized:
            return None
        key = self._alias_to_canonical.get(normalized)
        if key:
            return (key, self._fields[key]["canonical_name"], 1.0)
        return None

    def fuzzy_match(self, column_name: str, threshold: float = 0.75) -> Optional[Tuple[str, str, float]]:
        import difflib
        normalized = self._normalize(column_name)
        if not normalized:
            return None
        best_key = None
        best_score = 0.0
        for alias_key, canonical_key in self._alias_to_canonical.items():
            ratio = difflib.SequenceMatcher(None, normalized, alias_key).ratio()
            if ratio > best_score:
                best_score = ratio
                best_key = canonical_key
        if best_key and best_score >= threshold:
            score = round(best_score, 4)
            return (best_key, self._fields[best_key]["canonical_name"], score)
        return None

    def match_all(self, column_name: str, fuzzy_threshold: float = 0.75) -> Tuple[Optional[str], Optional[str], float]:
        exact = self.exact_match(column_name)
        if exact:
            return exact
        fuzzy = self.fuzzy_match(column_name, fuzzy_threshold)
        if fuzzy:
            return fuzzy
        return (None, None, 0.0)

    def get_canonical_name(self, key: str) -> Optional[str]:
        field = self._fields.get(key)
        if field:
            return field["canonical_name"]
        return None

    def get_category(self, key: str) -> Optional[str]:
        field = self._fields.get(key)
        if field:
            return field.get("category")
        return None

    def get_all_fields(self) -> Dict[str, dict]:
        return dict(self._fields)

    def get_field_by_canonical(self, canonical_name: str) -> Optional[dict]:
        for key, field in self._fields.items():
            if field["canonical_name"] == canonical_name:
                return field
        return None

    def get_all_canonical_names(self) -> List[str]:
        return [f["canonical_name"] for f in self._fields.values()]

    def get_dashboard_templates(self) -> Dict[str, dict]:
        templates = {}
        for key, field in self._fields.items():
            canonical = field["canonical_name"]
            priority = field.get("dashboard_priority", 0)
            category = field.get("category", "Unknown")
            templates[key] = {
                "canonical_name": canonical,
                "category": category,
                "priority": priority,
                "kpis": self._get_kpi_templates(key, field),
                "charts": self._get_chart_templates(key, field),
            }
        return templates

    @staticmethod
    def _get_kpi_templates(key: str, field: dict) -> List[dict]:
        canonical = field["canonical_name"]
        category = field.get("category", "Unknown")
        templates = []
        if category == "Dimension":
            templates.append({"id": f"kpi_unique_{key}", "title": f"Unique {canonical}", "aggregation": "unique"})
        elif category in ("Category", "Identifier"):
            templates.append({"id": f"kpi_unique_{key}", "title": f"Unique {canonical}", "aggregation": "unique"})
        return templates

    @staticmethod
    def _get_chart_templates(key: str, field: dict) -> List[dict]:
        canonical = field["canonical_name"]
        category = field.get("category", "Unknown")
        priority = field.get("dashboard_priority", 0)
        templates = []
        if category == "Currency" and priority >= 60:
            templates.append({
                "id": f"chart_{key}_trend",
                "title": f"{canonical} Trend",
                "data_key": key,
                "chart_type": "area",
                "aggregation": "sum",
                "requires": "Date"
            })
            templates.append({
                "id": f"chart_{key}_by_customer",
                "title": f"{canonical} by Customer",
                "data_key": key,
                "chart_type": "horizontal_bar",
                "aggregation": "sum",
                "requires": "Customer Name"
            })
        if category == "Measure" and priority >= 60:
            templates.append({
                "id": f"chart_{key}_trend",
                "title": f"{canonical} Trend",
                "data_key": key,
                "chart_type": "area",
                "aggregation": "sum",
                "requires": "Date"
            })
        if category == "Category" and priority >= 50:
            templates.append({
                "id": f"chart_{key}_distribution",
                "title": f"{canonical} Distribution",
                "data_key": key,
                "chart_type": "donut",
                "aggregation": "count",
                "requires": None
            })
        return templates
