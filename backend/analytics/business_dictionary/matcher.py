import json
import difflib
from typing import Dict, List, Optional, Tuple, Any

from analytics.business_dictionary.dictionary import BusinessDictionary


class ColumnMatch:
    def __init__(self, raw_column: str, canonical_key: Optional[str] = None,
                 canonical_name: Optional[str] = None, confidence: float = 0.0,
                 method: str = "none", category: Optional[str] = None):
        self.raw_column = raw_column
        self.canonical_key = canonical_key
        self.canonical_name = canonical_name
        self.confidence = round(confidence, 4)
        self.method = method
        self.category = category
        self.needs_confirmation = confidence < 0.9

    def to_dict(self) -> dict:
        return {
            "raw_column": self.raw_column,
            "canonical_key": self.canonical_key,
            "canonical_name": self.canonical_name,
            "confidence": self.confidence,
            "method": self.method,
            "category": self.category,
            "needs_confirmation": self.needs_confirmation,
        }

    def __repr__(self):
        return (f"ColumnMatch({self.raw_column} → {self.canonical_name or '?'} "
                f"[{self.method}, {self.confidence:.0%}]"
                f"{', needs confirmation' if self.needs_confirmation else ''})")


class ColumnMatcher:
    def __init__(self, dictionary: Optional[BusinessDictionary] = None):
        self.dictionary = dictionary or BusinessDictionary()
        self._pending_confirmations: List[ColumnMatch] = []

    def match_exact(self, column_name: str) -> Optional[ColumnMatch]:
        result = self.dictionary.exact_match(column_name)
        if result:
            key, canonical, score = result
            return ColumnMatch(
                raw_column=column_name,
                canonical_key=key,
                canonical_name=canonical,
                confidence=score,
                method="exact",
                category=self.dictionary.get_category(key),
            )
        return None

    def match_fuzzy(self, column_name: str, threshold: float = 0.75) -> Optional[ColumnMatch]:
        result = self.dictionary.fuzzy_match(column_name, threshold)
        if result:
            key, canonical, score = result
            method = "fuzzy_high" if score >= 0.9 else "fuzzy"
            return ColumnMatch(
                raw_column=column_name,
                canonical_key=key,
                canonical_name=canonical,
                confidence=score,
                method=method,
                category=self.dictionary.get_category(key),
            )
        return None

    def match_ai_semantic(self, column_name: str, sample_values: List[str],
                          client: Any, llm_model: Optional[str] = None) -> Optional[ColumnMatch]:
        try:
            from analytics.utils.llm_client import generate_content_safe
            all_fields = self.dictionary.get_all_fields()
            canonical_options = []
            for key, field in all_fields.items():
                canonical_options.append(f'  "{key}": "{field["canonical_name"]}" ({field.get("category", "Unknown")})')

            fields_text = "\n".join(canonical_options)
            samples_text = json.dumps(sample_values[:5], ensure_ascii=False)

            prompt = f"""You are a business data mapping assistant. Match the given column name to the best canonical business field from the dictionary.

Column name: "{column_name}"
Sample values: {samples_text}

Available canonical fields:
{fields_text}

Return a JSON object:
{{
  "canonical_key": "the matching key from the dictionary, or null if no match",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of why this field matches"
}}

Rules:
- Prefer exact or close semantic matches
- "amount received"/"received amount" → amount_received, NOT revenue
- "customer mobile"/"phone" → customer_phone, NOT customer_name
- "total" alone → revenue (generic total amount)
- If unsure, return confidence < 0.5
- Only match if you are at least 50% sure"""

            res_text = generate_content_safe(
                client, prompt, json_mode=True, model=llm_model,
                cache_key=f"col_match_{column_name}"
            )
            result = json.loads(res_text)
            key = result.get("canonical_key")
            confidence = float(result.get("confidence", 0.0))

            if key and key in all_fields and confidence >= 0.5:
                return ColumnMatch(
                    raw_column=column_name,
                    canonical_key=key,
                    canonical_name=all_fields[key]["canonical_name"],
                    confidence=min(confidence, 0.95),
                    method="ai_semantic",
                    category=all_fields[key].get("category", "Unknown"),
                )
        except Exception as e:
            print(f"[ColumnMatcher] AI semantic match failed for '{column_name}': {e}", flush=True)
        return None

    def match_column(self, column_name: str, sample_values: Optional[List[str]] = None,
                     client: Any = None, fuzzy_threshold: float = 0.75) -> ColumnMatch:
        exact = self.match_exact(column_name)
        if exact:
            return exact

        fuzzy = self.match_fuzzy(column_name, fuzzy_threshold)
        if fuzzy and fuzzy.confidence >= 0.85:
            return fuzzy

        if client and sample_values:
            ai = self.match_ai_semantic(column_name, sample_values, client)
            if ai and ai.confidence >= 0.7:
                return ai

        if fuzzy:
            return fuzzy

        return ColumnMatch(
            raw_column=column_name,
            method="none",
            confidence=0.0,
        )

    def match_columns_batch(self, headers: List[str], rows: List[Dict[str, Any]],
                            client: Any = None) -> Dict[str, ColumnMatch]:
        column_values: Dict[str, List[str]] = {}
        for row in rows[:50]:
            for h in headers:
                val = row.get(h)
                if val is not None and str(val).strip():
                    column_values.setdefault(h, []).append(str(val).strip())

        results = {}
        for h in headers:
            samples = column_values.get(h, [])[:5]
            results[h] = self.match_column(h, sample_values=samples, client=client)
            if results[h].needs_confirmation and results[h].method != "none":
                self._pending_confirmations.append(results[h])
        return results

    def get_pending_confirmations(self) -> List[ColumnMatch]:
        return list(self._pending_confirmations)

    def confirm_mapping(self, raw_column: str, canonical_key: str, save_alias: bool = True) -> Optional[ColumnMatch]:
        if canonical_key not in self.dictionary.get_all_fields():
            print(f"[ColumnMatcher] Unknown canonical key: {canonical_key}", flush=True)
            return None
        field = self.dictionary.get_all_fields()[canonical_key]
        match = ColumnMatch(
            raw_column=raw_column,
            canonical_key=canonical_key,
            canonical_name=field["canonical_name"],
            confidence=1.0,
            method="user_confirmed",
            category=field.get("category", "Unknown"),
        )
        if save_alias:
            self.dictionary.add_alias(canonical_key, raw_column)
        self._pending_confirmations = [p for p in self._pending_confirmations
                                       if p.raw_column != raw_column]
        return match

    def clear_pending(self):
        self._pending_confirmations.clear()
