import pandas as pd
from typing import List, Dict, Any, Tuple

import os
import json

from analytics.udie.file_classifier import classify_file
from analytics.udie.pdf_intelligence import classify_pdf
from analytics.udie.adaptive_extraction import extract_tables_adaptive
from analytics.udie.data_validation import validate_extracted_data
from analytics.udie.header_repair import repair_headers_batch
from analytics.udie.semantic_classification import classify_columns
from analytics.udie.relevance_scorer import score_column_relevance
from analytics.udie.bi_detection import detect_existing_bi_summaries
from analytics.udie.analytics_discovery import discover_analytics
from analytics.udie.confidence_scoring import calculate_overall_confidence
from analytics.udie.explainability import inject_explainability_layer
from analytics.business_dictionary.dictionary import BusinessDictionary
from analytics.business_dictionary.matcher import ColumnMatcher
import analytics.ingestion.parser as parser_module


class UniversalDataIntelligenceEngine:
    """
    Unified orchestrator for the Enterprise Universal Data Intelligence Engine (UDIE)
    encompassing Modules 1 to 12.
    """
    def __init__(self, client=None, business_dictionary=None):
        self.client = client
        self.dictionary = business_dictionary or BusinessDictionary()
        self.matcher = ColumnMatcher(self.dictionary)

    def parse_uploaded_file(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Runs Modules 1, 2, 3, 4, 5, 6, 7 in sequence to parse raw file bytes.
        """
        # 1. Module 1: File Classification
        file_format, classifier_info = classify_file(file_bytes, filename)
        
        headers: List[str] = []
        rows: List[Dict[str, Any]] = []
        rag_text = ""
        raw_tables = []
        pdf_info = {}
        
        # 2. Parse file using General/Hybrid parser
        headers, rows, _, _, rag_text = parser_module.parse_file(file_bytes, filename, self.client)
        
        # Keep pdf_info if PDF
        if file_format == "pdf":
            try:
                pdf_info = classify_pdf(file_bytes)
            except Exception:
                pdf_info = {}
        else:
            pdf_info = {}
            
        return self._process_parsed_data(headers, rows, rag_text, file_format, pdf_info, file_bytes)

    def parse_raw_grid_data(self, grid: List[List[Any]], filename: str) -> Dict[str, Any]:
        """
        Runs Modules 3, 4, 5, 6, 7 on a raw 2D grid list (e.g. from Google Sheets).
        """
        file_format = "xlsx"
        pdf_info = {}
        rag_text = ""
        
        # Parse sheet grid using Excel layout solver helper
        headers, rows, _, _, _ = parser_module.parse_grid_data(grid, filename, self.client)
        
        return self._process_parsed_data(headers, rows, rag_text, file_format, pdf_info, b"")

    def _process_parsed_data(
        self,
        headers: List[str],
        rows: List[Dict[str, Any]],
        rag_text: str,
        file_format: str,
        pdf_info: Dict[str, Any],
        file_bytes: bytes
    ) -> Dict[str, Any]:
        """
        Shared internal helper to clean, validate, score, and format parsed data.
        """
        # If data was empty, fallback/raise
        if not rows:
            return {
                "fileType": file_format,
                "headers": [],
                "rows": [],
                "columnTypes": {},
                "ragText": rag_text,
                "validation": {"isValid": False, "confidence": 0.0, "issues": ["No rows found"]}
            }

        # 3. Module 4: Data Validation Engine
        validation_report = validate_extracted_data(headers, rows)
        col_types = validation_report.get("typeProfile", {})
        
        # 4. Module 5: Header Repair Engine
        repaired_headers_map = repair_headers_batch(headers, col_types, rows, self.client)
        
        # Rewrite rows and headers using repaired clean names (coalescing columns that map to the same name)
        repaired_headers = []
        for h in headers:
            rh = repaired_headers_map.get(h, h)
            if rh not in repaired_headers:
                repaired_headers.append(rh)
                
        repaired_rows = []
        from analytics.ingestion.parser import is_empty_value
        for r in rows:
            repaired_r = {}
            for col in headers:
                repaired_col = repaired_headers_map.get(col, col)
                val = r.get(col)
                if repaired_col in repaired_r:
                    existing_val = repaired_r[repaired_col]
                    if is_empty_value(existing_val) and not is_empty_value(val):
                        repaired_r[repaired_col] = val
                else:
                    repaired_r[repaired_col] = val
            repaired_rows.append(repaired_r)
            
        # Mobile number lookup propagation and healing
        import re
        import difflib
        
        cust_name_col = None
        mobile_col = None
        for col in repaired_headers:
            col_lower = str(col).lower()
            if "customer" in col_lower and "name" in col_lower:
                cust_name_col = col
            elif "mobile" in col_lower or "phone" in col_lower or "contact" in col_lower:
                mobile_col = col
                
        if cust_name_col and mobile_col:
            phone_map = {}
            
            def normalize_name(name_str):
                ns = str(name_str).lower().strip()
                ns = re.sub(r'\b(ji|sons|pvt|ltd|corp|co|company|mr|mrs|dr|architect|ar)\b', '', ns)
                ns = re.sub(r'[^a-z0-9]', '', ns)
                return ns.strip()
                
            def is_valid_mobile(val):
                if val is None:
                    return False
                digits = re.sub(r'\D', '', str(val))
                return len(digits) >= 10
                
            for r in repaired_rows:
                c_name = r.get(cust_name_col)
                c_phone = r.get(mobile_col)
                if c_name and is_valid_mobile(c_phone):
                    norm_name = normalize_name(c_name)
                    if norm_name:
                        phone_map[norm_name] = str(c_phone).strip()
                        
            for r in repaired_rows:
                c_name = r.get(cust_name_col)
                c_phone = r.get(mobile_col)
                
                if not is_valid_mobile(c_phone) and c_name:
                    norm_name = normalize_name(c_name)
                    if norm_name:
                        healed_phone = phone_map.get(norm_name)
                        if not healed_phone:
                            best_ratio = 0.0
                            best_match = None
                            for existing_norm in phone_map.keys():
                                ratio = difflib.SequenceMatcher(None, norm_name, existing_norm).ratio()
                                if ratio > 0.8 and ratio > best_ratio:
                                    best_ratio = ratio
                                    best_match = existing_norm
                            if best_match:
                                healed_phone = phone_map[best_match]
                        
                        if healed_phone:
                            r[mobile_col] = healed_phone
                        else:
                            r[mobile_col] = None
            
        repaired_col_types = {}
        for col, t in col_types.items():
            repaired_col = repaired_headers_map.get(col, col)
            repaired_col_types[repaired_col] = t

        # 5. Module 6: Semantic Column Classification
        classifications = classify_columns(repaired_headers, repaired_col_types, repaired_rows, self.client)
        
        # 6. Module 7: Business Relevance Scoring
        relevance_scores = score_column_relevance(classifications)

        # Module 7.5: Generic Category Value Self-Healing (Fuzzy Clustering of Rare Typos)
        try:
            import re
            import difflib
            import pandas as pd
            df_temp = pd.DataFrame(repaired_rows)
            healed_cols = []
            
            for col in df_temp.columns:
                # Only heal columns classified as Category, Text, or Dimension
                col_cat = classifications.get(col, {}).get("category", "Unknown")
                if col_cat not in ["Category", "Text", "Dimension"]:
                    continue
                    
                series_clean = df_temp[col].dropna().astype(str).str.strip()
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
                    healed = healing_map.get(val_str, val_str)
                    return re.sub(r'\s+', ' ', healed)
                    
                if healing_map:
                    print(f"[Generic Ingestion Category Healer] Mapped rare categories in '{col}': {healing_map}", flush=True)
                    df_temp[col] = df_temp[col].apply(apply_healing)
                    healed_cols.append(col)
            
            if healed_cols:
                repaired_rows = df_temp.to_dict(orient="records")
        except Exception as e:
            print(f"[Generic Ingestion Category Healer] Failed: {e}", flush=True)

        # Module 8.5: Business Dictionary Column Matching & Category Enforcement
        classifications, relevance_scores, canonical_mapping = self._enforce_predefined_fields(
            repaired_headers, classifications, relevance_scores
        )
        pending_mappings = []
        for h, mapping in canonical_mapping.items():
            if mapping.get("canonical_key") and mapping.get("confidence", 0.0) < 0.9:
                pending_mappings.append(mapping)

        # Module 9: Existing BI Summary Detection
        bi_report = detect_existing_bi_summaries(repaired_rows, repaired_headers)
        cleaned_rows = bi_report.get("cleanedTransactionalRows", repaired_rows)
        detected_cards = bi_report.get("summaryCards", [])

        # Export intermediate debug stages for inspection
        try:
            import os
            import json
            
            debug_dir = "/Users/adityapratapsinghrathore/Desktop/data-insights/backend/data/debug_stages"
            os.makedirs(debug_dir, exist_ok=True)
            
            # Stage 1: Raw extracted text
            with open(os.path.join(debug_dir, "1_raw_extracted_text.txt"), "w", encoding="utf-8") as f:
                f.write(rag_text)
                
            # Stage 2: Raw extracted tables
            with open(os.path.join(debug_dir, "2_raw_extracted_tables.json"), "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)
                
            # Stage 3: Parsed dataframe before cleaning
            df_stage3 = pd.DataFrame(rows)
            df_stage3.to_csv(os.path.join(debug_dir, "3_parsed_dataframe_before_cleaning.csv"), index=False)
            
            # Stage 4: Cleaned dataframe
            cleaned_rows_stage4 = []
            for r in rows:
                cleaned_r = {}
                for k, v in r.items():
                    val_str = str(v).strip() if v is not None else ""
                    cleaned_r[k] = val_str if val_str else None
                cleaned_rows_stage4.append(cleaned_r)
            df_stage4 = pd.DataFrame(cleaned_rows_stage4)
            df_stage4.to_csv(os.path.join(debug_dir, "4_cleaned_dataframe.csv"), index=False)
            
            # Stage 5: Header normalization result
            with open(os.path.join(debug_dir, "5_header_normalization_result.json"), "w", encoding="utf-8") as f:
                json.dump(repaired_headers_map, f, indent=2)
                
            # Stage 6: Semantic column mapping
            semantic_mapping = {col: info.get("category", "Unknown") for col, info in classifications.items()}
            with open(os.path.join(debug_dir, "6_semantic_column_mapping.json"), "w", encoding="utf-8") as f:
                json.dump(semantic_mapping, f, indent=2)
                
            # Stage 7: Final dataframe used for analytics
            df_stage7 = pd.DataFrame(cleaned_rows)
            df_stage7.to_csv(os.path.join(debug_dir, "7_final_dataframe_used_for_analytics.csv"), index=False)
            
            print(f"[UDIE Debug] Successfully exported 7 intermediate stages to {debug_dir}", flush=True)
        except Exception as save_err:
            print(f"[UDIE Debug] Failed to save intermediate stages: {save_err}", flush=True)

        # Run Dataframe Stage Validation Checks (integrity blocking)
        from analytics.udie.dataframe_integrity import validate_dataframe_stages
        
        raw_tables_for_validation = pdf_info.get("primary_raw_tables", []) if file_format == "pdf" else []
        
        integrity_report = validate_dataframe_stages(
            file_bytes=file_bytes,
            file_format=file_format,
            raw_tables=raw_tables_for_validation,
            rows=cleaned_rows,
            headers=repaired_headers,
            repaired_headers_map=repaired_headers_map,
            classifications=classifications
        )

        return {
            "fileType": file_format,
            "headers": repaired_headers,
            "rows": cleaned_rows,
            "detectedCards": detected_cards,
            "columnTypes": repaired_col_types,
            "ragText": rag_text,
            "validation": {
                "isValid": validation_report.get("isValid", True),
                "confidence": validation_report.get("confidence", 1.0),
                "issues": validation_report.get("issues", [])
            },
            "classifications": classifications,
            "relevanceScores": relevance_scores,
            "pdfInfo": pdf_info,
            "integrityReport": integrity_report,
            "canonicalMapping": canonical_mapping,
            "pendingMappings": pending_mappings
        }

    def generate_dashboard_config(
        self,
        rows: List[Dict[str, Any]],
        headers: List[str],
        spreadsheet_name: str,
        document_id: str = None
    ) -> Dict[str, Any]:
        """
        Runs Modules 8, 9, 10, 11, 12 to generate a fully validated dashboard.
        """
        # Reconstruct base types
        from analytics.udie.data_validation import validate_extracted_data
        validation_report = validate_extracted_data(headers, rows)
        col_types = validation_report.get("typeProfile", {})
        
        # Module 6: Semantic Classification
        classifications = classify_columns(headers, col_types, rows, client=self.client)
        
        # Module 7: Relevance Scoring
        relevance_scores = score_column_relevance(classifications)

        # Business Dictionary Column Matching & Category Enforcement
        classifications, relevance_scores, canonical_mapping = self._enforce_predefined_fields(
            headers, classifications, relevance_scores
        )

        # Run Dataframe Stage Validation Checks (integrity blocking on load)
        from analytics.udie.dataframe_integrity import validate_dataframe_stages
        validate_dataframe_stages(
            file_bytes=b"",
            file_format="parquet",
            raw_tables=[],
            rows=rows,
            headers=headers,
            repaired_headers_map={},
            classifications=classifications
        )

        # Module 9: Existing BI Summary Detection with Side Metadata Loader
        detected_cards = []
        transactional_rows = rows
        
        if document_id:
            import os
            import json
            data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
            metadata_path = os.path.join(data_dir, f"{document_id}.metadata.json")
            if os.path.exists(metadata_path):
                try:
                    with open(metadata_path, "r", encoding="utf-8") as f:
                        meta = json.load(f)
                        detected_cards = meta.get("detectedCards", [])
                except Exception as meta_err:
                    print(f"[UDIE Config] Failed to load metadata JSON: {meta_err}")
                    
        # Fallback to dynamic parsing if no cards were pre-loaded/cached
        if not detected_cards:
            bi_report = detect_existing_bi_summaries(rows, headers)
            transactional_rows = bi_report.get("cleanedTransactionalRows", rows)
            detected_cards = bi_report.get("summaryCards", [])

        # Load into Pandas DataFrame for discover engine
        df_pd = pd.DataFrame(transactional_rows)

        # Business Dictionary Canonical Field Matching (already computed and enforced above)

        # Generate template-based KPIs from canonical fields
        template_kpis = self._generate_template_kpis(df_pd, headers, canonical_mapping)

        # Module 10: Analytics Discovery (KPIs + Charts + Anomaly loops)
        kpis, charts, anomalies = discover_analytics(df_pd, headers, classifications, relevance_scores, client=self.client, canonical_mapping=canonical_mapping)
        
        # Inject template-based KPIs from Business Dictionary (dedup by id AND title)
        seen_kpi_ids = {k.get("id") for k in kpis}
        seen_kpi_titles = {k.get("title", "").lower().strip() for k in kpis}
        for tk in template_kpis:
            tk_title = tk.get("title", "").lower().strip()
            if tk["id"] not in seen_kpi_ids and tk_title not in seen_kpi_titles:
                kpis.insert(0, tk)
                seen_kpi_ids.add(tk["id"])
                seen_kpi_titles.add(tk_title)

        # Inject detected BI summary cards into KPIs (dedup by title and value)
        seen_kpi_ids = {k.get("id") for k in kpis}
        seen_kpi_titles = {k.get("title", "").lower().strip() for k in kpis}
        for card in detected_cards:
            card_title = card.get("title", "").strip()
            card_title_lower = card_title.lower().strip()
            card_id = f"kpi_detected_bi_{card['sourceRow']}"
            if card_id in seen_kpi_ids or card_title_lower in seen_kpi_titles:
                continue
            kpis.insert(0, {
                "id": card_id,
                "type": "kpi",
                "title": card_title,
                "value": card["value"],
                "insights": f"Pre-existing summary figure detected from spreadsheet row {card['sourceRow']}."
            })
            seen_kpi_ids.add(card_id)
            seen_kpi_titles.add(card_title_lower)

        # Module 11: Confidence Scoring Engine
        validation_conf = validation_report.get("confidence", 1.0)
        issues = validation_report.get("issues", [])
        confidence_report = calculate_overall_confidence(validation_conf, classifications, issues)

        # Module 12: Explainability Layer
        kpis, charts = inject_explainability_layer(kpis, charts)
        
        # Consolidate KPIs and Charts into a single list expected by frontend
        dashboard_charts = []
        for kpi in kpis:
            dashboard_charts.append({
                "id": kpi["id"],
                "type": "kpi",
                "title": kpi["title"],
                "dataKey": kpi.get("dataKey", ""),
                "insights": kpi.get("insights", ""),
                "value": kpi["value"],
                "explainability": kpi.get("explainability")
            })
        for chart in charts:
            dashboard_charts.append(chart)

        schema_map = {}
        for col, info in classifications.items():
            schema_map[col] = info.get("category", "unknown")

        dashboard_config = {
            "charts": dashboard_charts,
            "anomalies": anomalies,
            "schemaMap": schema_map,
            "canonicalMapping": canonical_mapping,
            "confidenceReport": confidence_report,
            "profilingStats": {
                "summary": {
                    "totalRows": len(df_pd),
                    "totalColumns": len(headers),
                    "duplicateRows": int(df_pd.duplicated().sum()) if not df_pd.empty else 0,
                    "datatypeDistribution": {t: list(col_types.values()).count(t) for t in set(col_types.values())}
                }
            }
        }

        # Module 5 / LLM insight summary generation
        if self.client:
            from analytics.insights.insight_generator import generate_dashboard_insights
            try:
                # Mock schema adjustments to fit standard insights signature
                dashboard_config["summary"] = ""
                dashboard_config["recommendations"] = []
                # Execute Gemini summary insights on calculated statistics
                res_config = generate_dashboard_insights(dashboard_config, spreadsheet_name, self.client)
                dashboard_config["summary"] = res_config.get("summary", "Analysis completed successfully.")
                dashboard_config["recommendations"] = res_config.get("recommendations", [])
            except Exception as e:
                print(f"[UDIE Engine Insights] Gemini summary failed: {e}")
                dashboard_config["summary"] = f"Calculated {len(df_pd)} total rows and {len(headers)} columns. Detected {len(anomalies)} outliers."
                dashboard_config["recommendations"] = [
                    "Examine outlier rows shown in the profiling report to verify input quality.",
                    "Utilize the business chat interface below to run custom queries."
                ]
        else:
            dashboard_config["summary"] = f"Calculated {len(df_pd)} total rows and {len(headers)} columns. Detected {len(anomalies)} outliers."
            dashboard_config["recommendations"] = [
                "Examine outlier rows shown in the profiling report to verify input quality.",
                "Utilize the business chat interface below to run custom queries."
            ]

        # Add Low-Confidence Analytics Warning if overall score is low
        if confidence_report.get("status") == "low":
            dashboard_config["charts"] = []
            dashboard_config["summary"] = confidence_report.get("warningMessage")

        return dashboard_config

    def _generate_template_kpis(self, df_pd, headers, canonical_mapping):
        templates = self.dictionary.get_dashboard_templates()
        present_keys = set()
        for col, mapping in canonical_mapping.items():
            key = mapping.get("canonical_key")
            if key:
                present_keys.add(key)

        kpis = []
        seen_ids = set()
        import numpy as np

        for key in present_keys:
            template = templates.get(key)
            if not template:
                continue
            cat = template.get("category", "")
            # Only generate template KPIs for non-measure fields (Category/Dimension/Identifier)
            # Currency and Measure fields are handled by DiscoveryEngine
            if cat in ("Currency", "Measure"):
                continue
            for kpi_def in template.get("kpis", []):
                kpi_id = kpi_def["id"]
                if kpi_id in seen_ids:
                    continue
                seen_ids.add(kpi_id)
                agg = kpi_def.get("aggregation", "sum")
                col = self._find_column_for_key(headers, canonical_mapping, key)
                if not col or col not in df_pd.columns:
                    continue
                if agg == "unique":
                    val = int(df_pd[col].nunique(dropna=True))
                else:
                    continue
                kpis.append({
                    "id": kpi_id,
                    "type": "kpi",
                    "title": kpi_def["title"],
                    "value": val,
                    "dataKey": col,
                    "description": f"{kpi_def['title']} from {template['canonical_name']}"
                })
        return kpis

    @staticmethod
    def _find_column_for_key(headers, canonical_mapping, canonical_key):
        best_col = None
        best_method_rank = 99
        method_rank = {"exact": 0, "fuzzy": 1, "ai": 2, "none": 3}
        for col, mapping in canonical_mapping.items():
            if mapping.get("canonical_key") != canonical_key:
                continue
            method = mapping.get("method", "none")
            rank = method_rank.get(method, 99)
            if best_col is None or rank < best_method_rank:
                best_col = col
                best_method_rank = rank
        return best_col

    def _enforce_predefined_fields(
        self,
        headers: List[str],
        classifications: Dict[str, Dict[str, Any]],
        relevance_scores: Dict[str, int]
    ) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, int], Dict[str, dict]]:
        if classifications is None:
            classifications = {}
        if relevance_scores is None:
            relevance_scores = {}
        canonical_mapping = {}
        for h in headers:
            match = self.matcher.match_column(h)
            mapping = match.to_dict()
            canonical_mapping[h] = mapping
            
            # If it's not a predefined field, force classification to Text and relevance to 0
            if not match.canonical_key or match.method == "none":
                classifications[h] = {
                    "category": "Text",
                    "confidence": 0.0,
                    "meaning": "Unmapped non-predefined column",
                    "recommendedUsage": "Do not graph, do not generate KPIs"
                }
                relevance_scores[h] = 0
            else:
                # If matched, align its classification category with the predefined category
                if match.category:
                    classifications[h] = {
                        "category": match.category,
                        "confidence": match.confidence,
                        "meaning": f"Predefined canonical field: {match.canonical_name}",
                        "recommendedUsage": "Use in analytical dashboards"
                    }
                    # Keep relevance score aligned if it was 0 for Identifiers
                    if match.category == "Identifier":
                        relevance_scores[h] = 0
                    else:
                        score_map = {
                            "Currency": 100,
                            "Date": 95,
                            "Dimension": 90,
                            "Measure": 90,
                            "Percentage": 85,
                            "Category": 85,
                            "Boolean": 40,
                            "Remarks": 10,
                            "Text": 20
                        }
                        relevance_scores[h] = score_map.get(match.category, 90)
        return classifications, relevance_scores, canonical_mapping

