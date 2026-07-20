import re
import json
import math
from typing import List, Dict, Any, Tuple

# Pre-compiled mapping dictionary for Hindi, Hinglish, abbreviations, and common synonyms
SYNONYM_DICT = {
    # Customers
    "grahak": ("Customer Name", "customer_dimension"),
    "grahak_name": ("Customer Name", "customer_dimension"),
    "naam": ("Name", "customer_dimension"),
    "naam_grahak": ("Customer Name", "customer_dimension"),
    "client": ("Client Name", "customer_dimension"),
    "client_name": ("Client Name", "customer_dimension"),
    "cust": ("Customer Name", "customer_dimension"),
    "customer": ("Customer Name", "customer_dimension"),
    "customer_name": ("Customer Name", "customer_dimension"),
    "buyer": ("Buyer Name", "customer_dimension"),
    "buyer_name": ("Buyer Name", "customer_dimension"),
    "patron": ("Patron Name", "customer_dimension"),
    
    # Revenue / Sales
    "amt": ("Amount", "revenue_metric"),
    "price": ("Price", "revenue_metric"),
    "raashi": ("Amount", "revenue_metric"),
    "bikri": ("Sales Amount", "revenue_metric"),
    "sales_amt": ("Sales Amount", "revenue_metric"),
    "net_amt": ("Net Amount", "revenue_metric"),
    "invoice_amt": ("Invoice Amount", "revenue_metric"),
    "revenue": ("Revenue", "revenue_metric"),
    "sales": ("Sales", "revenue_metric"),
    "total_bill": ("Total Bill Value", "revenue_metric"),
    "bill_amt": ("Bill Amount", "revenue_metric"),
    "bill_val": ("Bill Value", "revenue_metric"),
    "profit": ("Profit", "revenue_metric"),
    "faida": ("Profit", "revenue_metric"),
    "munafe": ("Profit", "revenue_metric"),
    "gain": ("Gain", "revenue_metric"),
    "earning": ("Earning", "revenue_metric"),
    "salary": ("Salary", "revenue_metric"),
    "incentive": ("Incentive", "revenue_metric"),
    "commission": ("Commission", "revenue_metric"),
    "payment": ("Payment", "revenue_metric"),
    "bill": ("Bill Amount", "revenue_metric"),
    "billing": ("Total Billing", "revenue_metric"),
    
    # Costs / Expenses
    "cost": ("Cost", "cost_metric"),
    "kharch": ("Expense", "cost_metric"),
    "kharcha": ("Expense", "cost_metric"),
    "expense": ("Expense", "cost_metric"),
    "spending": ("Spending", "cost_metric"),
    "purchase": ("Purchase Amount", "cost_metric"),
    "discount": ("Discount", "cost_metric"),
    "chhoot": ("Discount", "cost_metric"),
    "tax": ("Tax", "cost_metric"),
    "kar": ("Tax", "cost_metric"),
    "gst": ("GST Amount", "cost_metric"),
    "vat": ("VAT Amount", "cost_metric"),
    "loss": ("Loss", "cost_metric"),
    "nuksan": ("Loss", "cost_metric"),
    
    # Quantity / Volume
    "qty": ("Quantity", "quantity_metric"),
    "quantity": ("Quantity", "quantity_metric"),
    "volume": ("Volume", "quantity_metric"),
    "count": ("Count", "quantity_metric"),
    "units": ("Units", "quantity_metric"),
    "matra": ("Quantity", "quantity_metric"),
    "pieces": ("Pieces", "quantity_metric"),
    "pcs": ("Pieces", "quantity_metric"),
    "weight": ("Weight", "quantity_metric"),
    "vajan": ("Weight", "quantity_metric"),
    "items_count": ("Items Count", "quantity_metric"),
    
    # Time
    "date": ("Date", "time_dimension"),
    "samay": ("Time", "time_dimension"),
    "tarikh": ("Date", "time_dimension"),
    "time": ("Time", "time_dimension"),
    "timestamp": ("Timestamp", "time_dimension"),
    "year": ("Year", "time_dimension"),
    "saal": ("Year", "time_dimension"),
    "month": ("Month", "time_dimension"),
    "mahina": ("Month", "time_dimension"),
    "day": ("Day", "time_dimension"),
    "din": ("Day", "time_dimension"),
    "period": ("Period", "time_dimension"),
    "invoice_date": ("Invoice Date", "time_dimension"),
    "order_date": ("Order Date", "time_dimension"),
    "created_at": ("Created Date", "time_dimension"),
    
    # Geography
    "city": ("City", "geography_dimension"),
    "shehar": ("City", "geography_dimension"),
    "state": ("State", "geography_dimension"),
    "rajya": ("State", "geography_dimension"),
    "region": ("Region", "geography_dimension"),
    "pradesh": ("Region", "geography_dimension"),
    "country": ("Country", "geography_dimension"),
    "desh": ("Country", "geography_dimension"),
    "location": ("Location", "geography_dimension"),
    "address": ("Address", "geography_dimension"),
    "pata": ("Address", "geography_dimension"),
    "zone": ("Zone", "geography_dimension"),
    "latitude": ("Latitude", "geography_dimension"),
    "longitude": ("Longitude", "geography_dimension"),
    "lat": ("Latitude", "geography_dimension"),
    "long": ("Longitude", "geography_dimension"),
    "site": ("Site Location", "geography_dimension"),
    
    # Employee
    "employee": ("Employee Name", "employee_dimension"),
    "karmachari": ("Employee Name", "employee_dimension"),
    "staff": ("Staff Name", "employee_dimension"),
    "runner": ("Runner Name", "employee_dimension"),
    "agent": ("Agent Name", "employee_dimension"),
    "member": ("Member Name", "employee_dimension"),
    "rep": ("Representative Name", "employee_dimension"),
    "salesperson": ("Salesperson Name", "employee_dimension"),
    "sales_rep": ("Salesperson Name", "employee_dimension"),
    "manager": ("Manager Name", "employee_dimension"),
    
    # Product
    "product": ("Product Name", "product_dimension"),
    "item": ("Item Name", "product_dimension"),
    "sku": ("SKU", "product_dimension"),
    "maal": ("Product Name", "product_dimension"),
    "samaan": ("Product Name", "product_dimension"),
    "material": ("Material Name", "product_dimension"),
    "goods": ("Goods Name", "product_dimension"),
    
    # Category
    "category": ("Category", "category_dimension"),
    "varg": ("Category", "category_dimension"),
    "dept": ("Department", "category_dimension"),
    "department": ("Department", "category_dimension"),
    "vibhag": ("Department", "category_dimension"),
    "division": ("Division", "category_dimension"),
    "vertical": ("Vertical", "category_dimension"),
    "role": ("Role", "category_dimension"),
    "type": ("Type", "category_dimension"),
    "status": ("Status", "category_dimension"),
    "priority": ("Priority", "category_dimension"),
    "group": ("Group", "category_dimension"),
    "payment_mode": ("Payment Mode", "category_dimension"),
    "payment_type": ("Payment Type", "category_dimension"),
    "payment_method": ("Payment Method", "category_dimension"),
    
    # Identifiers
    "id": ("ID", "identifier_dimension"),
    "code": ("Code", "identifier_dimension"),
    "serial": ("Serial Number", "identifier_dimension"),
    "serial_no": ("Serial Number", "identifier_dimension"),
    "no": ("Number", "identifier_dimension"),
    "invoice_no": ("Invoice Number", "identifier_dimension"),
    "bill_no": ("Bill Number", "identifier_dimension"),
    "transaction_id": ("Transaction ID", "identifier_dimension"),
    
    # Text
    "notes": ("Notes", "text_dimension"),
    "remarks": ("Remarks", "text_dimension"),
    "feedback": ("Feedback", "text_dimension"),
    "description": ("Description", "text_dimension"),
    "details": ("Details", "text_dimension"),
    "tippani": ("Remarks", "text_dimension"),
}

# Standard patterns for Rule Engine mapping (Layer 3)
RULE_PATTERNS = [
    (r'id$|^id_|challan|code|key|ref|serial|sno|sl_no|\bno\b|_no$', ("Identifier", "identifier_dimension")),
    (r'date|time|timestamp|created|updated|period|samay|tarikh|year|month|day', ("Date", "time_dimension")),
    (r'amount|amt|price|revenue|sales|profit|salary|incentive|commission|billing|payment|bill|tax|gst|vat|rate|raashi|bikri|faida', ("Value", "revenue_metric")),
    (r'cost|expense|spending|purchase|discount|chhoot|kharch|kharcha|loss|nuksan', ("Cost/Expense", "cost_metric")),
    (r'quantity|qty|volume|units|count|pcs|pieces|matra|vajan|weight', ("Quantity", "quantity_metric")),
    (r'customer|client|buyer|grahak|patron', ("Customer", "customer_dimension")),
    (r'employee|staff|runner|agent|rep|salesperson|karmachari|manager', ("Employee/Agent", "employee_dimension")),
    (r'city|state|region|country|location|address|lat|long|desh|shehar|pradesh|pata', ("Location", "geography_dimension")),
    (r'product|item|sku|maal|samaan|goods', ("Product/Item", "product_dimension")),
    (r'category|varg|dept|department|vertical|division|role|type|group|status|priority', ("Category/Type", "category_dimension")),
    (r'notes|remarks|feedback|description|tippani|details', ("Text/Remarks", "text_dimension"))
]

# Concept descriptors for Layer 5 (Embedding Similarity)
CONCEPTS = {
    "revenue_metric": "revenue sales income amount price profit billing salary payment money cash raashi bikri faida",
    "cost_metric": "cost expense spending purchase discount tax losses purchase price operating cost kharch kharcha",
    "quantity_metric": "quantity volume count units pieces weight count items product count matra",
    "customer_dimension": "customer client buyer patron name buyer name client name grahak",
    "employee_dimension": "employee staff runner worker representative agent manager team member karmachari",
    "time_dimension": "date time timestamp year month day period tarikh samay calendar invoice date order date",
    "geography_dimension": "city state region country location address city name branch location desh shehar pata",
    "product_dimension": "product item SKU material goods commodity product name item name maal",
    "category_dimension": "category department division vertical status priority role type group department name",
    "identifier_dimension": "ID code serial number key reference transaction number serial_no id",
    "text_dimension": "notes remarks feedback description details comments tippani feedback text"
}

class SemanticResolver:
    """
    Upgraded Universal Schema Understanding Layer utilizing a 6-layer architecture:
    Layer 1: Dictionary Matching
    Layer 2: Synonym Matching
    Layer 3: Pattern Detection
    Layer 4: Sample Value Analysis
    Layer 5: Embedding Similarity (Gemini API)
    Layer 6: LLM Fallback (Gemini Flash on low-confidence columns)
    """
    def __init__(self, client=None):
        self.client = client
        self._concept_embeddings = {}

    def _normalize_string(self, text: str) -> str:
        """
        Cleans special characters, spaces, and casts to lowercase.
        """
        s = str(text).lower().strip()
        s = re.sub(r'\(.*?\)', '', s)
        s = re.sub(r'[^a-z0-9_\s-]', '', s)
        s = re.sub(r'[\s-]+', '_', s)
        return s.strip('_')

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 0.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(y * y for y in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def _get_embedding(self, text: str) -> List[float]:
        """
        Fetches text embedding using Gemini text-embedding-004.
        """
        if not self.client:
            return []
        try:
            res = self.client.models.embed_content(
                model="text-embedding-004",
                contents=text
            )
            return res.embeddings[0].values
        except Exception as e:
            print(f"[Semantic Resolver Embed] API error: {e}")
            return []

    def _get_concept_embeddings(self) -> Dict[str, List[float]]:
        """
        Lazily fetches and caches target concept embeddings.
        """
        if not self._concept_embeddings and self.client:
            for cat, desc in CONCEPTS.items():
                emb = self._get_embedding(desc)
                if emb:
                    self._concept_embeddings[cat] = emb
        return self._concept_embeddings

    def resolve_column(self, col_name: str, col_type: str, sample_vals: List[Any] = None) -> Tuple[str, str, float]:
        """
        Resolves a single column using Layers 1 to 5.
        Returns (Normalized English Title, Semantic Category, Confidence).
        """
        norm_key = self._normalize_string(col_name)
        if not norm_key:
            return "Unnamed Column", "category_dimension", 0.0

        # --- Layer 1: Dictionary Matching ---
        if norm_key in SYNONYM_DICT:
            mapped_name, category = SYNONYM_DICT[norm_key]
            return mapped_name, category, 1.0

        # --- Layer 2: Synonym Matching ---
        tokens = norm_key.split('_')
        for t in tokens:
            if t in SYNONYM_DICT:
                mapped_name, category = SYNONYM_DICT[t]
                refined_name = col_name.replace(t, mapped_name).replace('_', ' ').strip().title()
                return refined_name, category, 0.95

        # --- Layer 3: Pattern Detection ---
        for pattern, (name_prefix, category) in RULE_PATTERNS:
            if re.search(pattern, norm_key):
                clean_title = col_name.replace('_', ' ').replace('-', ' ').strip().title()
                return clean_title, category, 0.90

        # --- Layer 4: Sample Value Analysis ---
        if sample_vals:
            # Check for boolean patterns
            boolean_matches = 0
            date_matches = 0
            currency_matches = 0
            for val in sample_vals:
                val_str = str(val).strip().lower()
                if val_str in ["true", "false", "yes", "no", "active", "inactive"]:
                    boolean_matches += 1
                if re.match(r'^\d{4}-\d{2}-\d{2}$|^\d{2}/\d{2}/\d{4}$|^\d{4}/\d{2}/\d{2}$', val_str):
                    date_matches += 1
                if any(sym in val_str for sym in ['₹', '$', '€', '£', 'rs']):
                    currency_matches += 1
                    
            total_samples = len(sample_vals)
            if boolean_matches / total_samples > 0.8:
                clean_title = col_name.replace('_', ' ').replace('-', ' ').strip().title()
                return clean_title, "category_dimension", 0.85
            if date_matches / total_samples > 0.8:
                clean_title = col_name.replace('_', ' ').replace('-', ' ').strip().title()
                return clean_title, "time_dimension", 0.85
            if currency_matches / total_samples > 0.8:
                clean_title = col_name.replace('_', ' ').replace('-', ' ').strip().title()
                return clean_title, "revenue_metric", 0.85

        # --- Layer 5: Embedding Similarity (Bypassed to prevent latency/rate-limiting/retries from hanging the server) ---
        if False:
            col_emb = self._get_embedding(col_name.replace('_', ' '))
            concept_embs = self._get_concept_embeddings()
            if col_emb and concept_embs:
                best_cat = None
                best_sim = 0.0
                for cat, c_emb in concept_embs.items():
                    sim = self._cosine_similarity(col_emb, c_emb)
                    if sim > best_sim:
                        best_sim = sim
                        best_cat = cat
                if best_sim > 0.70 and best_cat:
                    clean_title = col_name.replace('_', ' ').replace('-', ' ').strip().title()
                    # Map to standard readable name
                    mapped_concept_name = best_cat.replace('_dimension', '').replace('_metric', '').replace('_', ' ').title()
                    return clean_title, best_cat, best_sim

        # --- Local String Sim Fallback (Jaccard trigram overlap) ---
        best_match = None
        best_score = 0.0
        for dict_key, (mapped_name, category) in SYNONYM_DICT.items():
            score = self._compute_token_similarity(norm_key, dict_key)
            if score > best_score:
                best_score = score
                best_match = (mapped_name, category)

        if best_score > 0.70 and best_match:
            clean_title = col_name.replace('_', ' ').replace('-', ' ').strip().title()
            return clean_title, best_match[1], best_score

        # Context-based default fallbacks
        clean_title = col_name.replace('_', ' ').replace('-', ' ').strip().title()
        if col_type == "numeric":
            return clean_title, "revenue_metric", 0.55
        elif col_type == "date":
            return clean_title, "time_dimension", 0.65
        return clean_title, "category_dimension", 0.40

    def _compute_token_similarity(self, s1: str, s2: str) -> float:
        def get_ngrams(s, n=2):
            return set(s[i:i+n] for i in range(len(s)-n+1))
        g1 = get_ngrams(s1)
        g2 = get_ngrams(s2)
        if not g1 or not g2:
            return 0.0
        return len(g1.intersection(g2)) / len(g1.union(g2))

    def resolve_columns_batch(self, headers: List[str], column_types: Dict[str, str], rows: List[Dict[str, Any]]) -> Tuple[List[str], Dict[str, str]]:
        """
        Runs resolution across all headers. Columns with confidence < 0.8 are batched
        and classified using Layer 6: LLM Fallback (Gemini).
        """
        normalized_headers = []
        schema_map = {}
        low_confidence_cols = []
        resolved_temp = {}
        
        # Run layers 1-5
        for col in headers:
            col_type = column_types.get(col, "text")
            
            samples = []
            for r in rows[:50]:
                val = r.get(col)
                if val is not None and str(val).strip() != "":
                    samples.append(str(val)[:30])
                    if len(samples) >= 3:
                        break
                        
            refined_name, category, confidence = self.resolve_column(col, col_type, samples)
            
            if confidence < 0.8:
                low_confidence_cols.append({
                    "originalHeader": col,
                    "dataType": col_type,
                    "samples": samples
                })
                resolved_temp[col] = (refined_name, category)
            else:
                schema_map[refined_name] = category
                resolved_temp[col] = (refined_name, category)

        # --- Layer 6: LLM Fallback ---
        if low_confidence_cols and self.client:
            try:
                print(f"[Semantic Resolver] Layer 6 (LLM) activated for low-confidence columns: {[c['originalHeader'] for c in low_confidence_cols]}")
                prompt = f"""
You are a database semantic mapping AI. You will receive a list of columns that could not be resolved deterministically.
Your task is to:
1. Translate any Hindi/Hinglish words or abbreviations to clean, descriptive, natural English headers.
2. Classify each column into one of these semantic categories:
   - "revenue_metric" (revenue, sales, income, billing, payments, salaries, incentives, taxes)
   - "cost_metric" (costs, expenses, purchases, discounts, losses)
   - "quantity_metric" (quantities, counts, units, volume, weight)
   - "customer_dimension" (names of buyers, clients, users, members)
   - "employee_dimension" (names of staff, employees, reps, agents, managers)
   - "time_dimension" (dates, periods, years, timestamps)
   - "geography_dimension" (cities, states, regions, locations, addresses)
   - "product_dimension" (products, items, SKUs, materials)
   - "category_dimension" (categories, departments, divisions, statuses, priorities, roles)
   - "identifier_dimension" (IDs, serial numbers, codes, invoice numbers)
   - "text_dimension" (notes, remarks, descriptions, feedback)

COLUMNS TO RESOLVE:
{json.dumps(low_confidence_cols, indent=2)}

Return ONLY a JSON response mapping the "originalHeader" to a JSON object with "cleanedHeader" and "category".
Example output format:
{{
  "grahak_naam": {{"cleanedHeader": "Customer Name", "category": "customer_dimension"}},
  "raashi": {{"cleanedHeader": "Amount", "category": "revenue_metric"}}
}}
Do NOT write markdown, code blocks, or explanations.
"""
                res = self.client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config={"response_mime_type": "application/json"}
                )
                
                ai_resolved = json.loads(res.text.strip())
                for col_info in low_confidence_cols:
                    orig = col_info["originalHeader"]
                    res_val = ai_resolved.get(orig, {})
                    cleaned = res_val.get("cleanedHeader", resolved_temp[orig][0])
                    category = res_val.get("category", resolved_temp[orig][1])
                    
                    schema_map[cleaned] = category
                    resolved_temp[orig] = (cleaned, category)
            except Exception as e:
                print(f"[Semantic Resolver Layer 6] LLM fallback failed: {e}. Falling back to default values.")

        # Re-build final list and mapping keys
        final_headers = []
        for col in headers:
            final_headers.append(resolved_temp[col][0])
            
        for orig, (cleaned, category) in resolved_temp.items():
            schema_map[cleaned] = category

        return final_headers, schema_map
