import re
import json
from typing import List, Dict, Any, Tuple

# Comprehensive local business synonyms map
SYNONYM_DICT = {
    # Revenue / Sales
    "amount": "Amount", "amt": "Amount", "price": "Price", "sales": "Sales", "revenue": "Revenue",
    "income": "Income", "billing": "Billing", "payment": "Payment", "money": "Money", "cash": "Cash",
    "raashi": "Amount", "bikri": "Sales", "faida": "Profit", "profit": "Profit", "margin": "Margin",
    "incentive": "Incentive", "salary": "Salary", "gst": "GST", "tax": "Tax",
    "tvialluee": "Total Value", "total_value": "Total Value", "total_bill_value": "Total Bill Value",
    
    # Cost / Expense
    "kharch": "Expense", "kharcha": "Expense", "expense": "Expense", "cost": "Cost", "spending": "Spending",
    "purchase": "Purchase", "discount": "Discount", "chhoot": "Discount", "loss": "Loss", "nuksan": "Loss",
    
    # Quantity
    "qty": "Quantity", "quantity": "Quantity", "volume": "Volume", "count": "Count", "units": "Units",
    "matra": "Quantity", "pieces": "Pieces", "pcs": "Pieces", "weight": "Weight", "vajan": "Weight",
    "qtyttt": "Quantity",
    
    # Time
    "date": "Date", "samay": "Time", "tarikh": "Date", "time": "Time", "timestamp": "Timestamp",
    "year": "Year", "saal": "Year", "month": "Month", "mahina": "Month", "day": "Day", "din": "Day",
    "period": "Period", "invoice_date": "Invoice Date", "order_date": "Order Date",
    
    # Geography
    "city": "City", "shehar": "City", "state": "State", "rajya": "State", "region": "Region",
    "pradesh": "Region", "country": "Country", "desh": "Country", "location": "Location",
    "address": "Address", "pata": "Address", "zone": "Zone", "lat": "Latitude", "long": "Longitude",
    
    # Employee
    "employee": "Employee", "karmachari": "Employee", "staff": "Staff",
    "runner": "Runner", "agent": "Agent", "member": "Member", "rep": "Representative",
    "salesperson": "Salesperson", "sales_rep": "Salesperson", "manager": "Manager",
    
    # Customer
    "customer": "Customer", "grahak": "Customer", "client": "Client",
    "buyer": "Buyer", "patron": "Patron",
    
    # Product
    "product": "Product", "item": "Item", "maal": "Product",
    "samaan": "Product", "material": "Material", "goods": "Goods",
    
    # Category
    "category": "Category", "varg": "Category", "dept": "Department", "department": "Department",
    "vibhag": "Department", "division": "Division", "vertical": "Vertical", "role": "Role",
    "type": "Type", "status": "Status", "priority": "Priority", "group": "Group"
}

def clean_header_string(text: str) -> str:
    """
    Cleans punctuation, replaces spaces/hyphens with underscore, and converts to lowercase.
    """
    s = str(text).lower().strip()
    s = re.sub(r'\(.*?\)', '', s)  # remove parenthesized parts
    s = re.sub(r'[^a-z0-9_\s-]', '', s)
    s = re.sub(r'[\s-]+', '_', s)
    return s.strip('_')

def compute_jaccard_similarity(s1: str, s2: str) -> float:
    """
    Computes character trigram Jaccard similarity.
    """
    def get_trigrams(s):
        s = f"^{s}$"
        return set(s[i:i+3] for i in range(len(s)-2))
    
    set1, set2 = get_trigrams(s1), get_trigrams(s2)
    if not set1 or not set2:
        return 0.0
    return len(set1 & set2) / len(set1 | set2)

def clean_header_heuristically(h: str) -> str:
    h_clean = str(h).strip()
    h_lower = h_clean.lower()
    
    if "muombbileer" in h_lower or ("customer" in h_lower and "mobile" in h_lower) or "customer no" in h_lower or "customer num" in h_lower or "mobile number" in h_lower:
        return "Customer Mobile Number"
    if "tvialluee" in h_lower or "total bill" in h_lower or "t₹o" in h_lower or "total_bill" in h_lower:
        return "Total Bill Value"
    if "quanttitiyl" in h_lower or "quanttit" in h_lower or "quantity" in h_lower or "qty" in h_lower:
        if "marble" in h_lower:
            return "Total Marble & Granite Quantity"
        if "imported" in h_lower or "exotic" in h_lower:
            return "Total Imported/Exotic Quantity"
        return "Total Quantity"
    if "mtoatrabl" in h_lower or "mtfot" in h_lower or "marble & granite" in h_lower or "total maal" in h_lower:
        if "value" in h_lower or "₹" in h_lower or "bika" in h_lower or "wapas" in h_lower or "paisa" in h_lower:
            if "bika" in h_lower:
                return "Total Maal Bika"
            if "wapas" in h_lower:
                return "Total Maal Wapas Aaya"
            if "paisa" in h_lower:
                return "Total Paisa Aaya"
            return "Total Marble & Granite Value"
        return "Total Marble & Granite Quantity"
    if "itmotpaol" in h_lower or "imported / exotic" in h_lower or "imported/exotic" in h_lower:
        if "value" in h_lower or "₹" in h_lower or "bill" in h_lower:
            return "Total Imported/Exotic Value"
        return "Total Imported/Exotic Quantity"
    if "anmowount" in h_lower or "amount received" in h_lower or "paisa aaya" in h_lower:
        return "Amount Received"
    if "pkaayisme" in h_lower or "payment mode" in h_lower or "paisa" in h_lower:
        return "Payment Mode"
    if "item details" in h_lower or "remarks" in h_lower:
        return "Item Details & Remarks"
    if "transaction type" in h_lower:
        return "Transaction Type"
    if "udhaari" in h_lower or "balance" in h_lower:
        return "Final Udhaari / Balance"
    if "avg. rate" in h_lower or "average rate" in h_lower:
        if "tile" in h_lower:
            return "Tile Avg. Rate"
        if "marble" in h_lower:
            return "Marble Avg. Rate"
        if "exotic" in h_lower:
            return "Exotic Avg. Rate"
        return "Average Rate"
        
    return h_clean.replace('_', ' ').replace('-', ' ').strip().title()

def repair_headers_batch(headers: List[str], col_types: Dict[str, str], rows: List[Dict[str, Any]], client = None) -> Dict[str, str]:
    """
    Module 5: Header Repair Engine.
    Repairs damaged headers (e.g. 'qtyttt' -> 'Quantity') via dictionary matching,
    regex cleanup, similarity checks, and a lightweight LLM fallback.
    Returns: {original_header: repaired_header}
    """
    repaired_map = {}
    low_confidence_headers = []
    
    for header in headers:
        # Heuristic Match First (prioritize clean-ups for known garbled/Hinglish patterns)
        cleaned_heur = clean_header_heuristically(header)
        h_lower = header.lower()
        has_garbled_kw = any(garb in h_lower for garb in ["muombbileer", "tvialluee", "quanttitiyl", "mtoatrabl", "mtfot", "itmotpaol", "anmowount", "pkaayisme"])
        if cleaned_heur != header or has_garbled_kw:
            repaired_map[header] = cleaned_heur
            continue

        cleaned = clean_header_string(header)
        
        # 1. Exact Dictionary Match
        if cleaned in SYNONYM_DICT:
            repaired_map[header] = SYNONYM_DICT[cleaned]
            continue
            
        # 2. Tokenized Synonym Match
        tokens = cleaned.split('_')
        matched_token = False
        for t in tokens:
            if t in SYNONYM_DICT:
                repaired_map[header] = re.sub(re.escape(t), SYNONYM_DICT[t], header, flags=re.IGNORECASE).replace('_', ' ').replace('-', ' ').strip().title()
                matched_token = True
                break
        if matched_token:
            continue
            
        # 3. Trigram Similarity Match
        best_match = None
        best_score = 0.0
        for key, standard_name in SYNONYM_DICT.items():
            sim = compute_jaccard_similarity(cleaned, key)
            if sim > best_score:
                best_score = sim
                best_match = standard_name
                
        if best_score > 0.70 and best_match:
            repaired_map[header] = best_match
            continue
            
        # 4. Regex Normalizations
        # Remove duplicate consecutive chars e.g. qtyttt -> qtyt, tvialluee -> tviablue
        deduped = re.sub(r'(.)\1+', r'\1', cleaned)
        if deduped in SYNONYM_DICT:
            repaired_map[header] = SYNONYM_DICT[deduped]
            continue
            
        # Low confidence: add to LLM batch
        low_confidence_headers.append(header)

    # 5. LLM Fallback (Single batch call for low-confidence headers)
    if low_confidence_headers and client:
        try:
            # Gather sample values (max 5)
            samples_info = []
            for h in low_confidence_headers:
                h_type = col_types.get(h, "text")
                h_samples = []
                for r in rows[:50]:
                    val = r.get(h)
                    if val is not None and str(val).strip() != "":
                        h_samples.append(str(val)[:30])
                        if len(h_samples) >= 5:
                            break
                samples_info.append({
                    "damagedHeader": h,
                    "inferredType": h_type,
                    "sampleValues": h_samples
                })
                
            prompt = f"""
You are an expert Data Ingestion Engine. Your task is to repair a list of damaged or corrupted column headers extracted from a spreadsheet/PDF.
For each column, you are given the damaged header, its datatype, and some sample values.
Return a clean, business-friendly English title for each column (e.g. "QTYTTT" -> "Quantity", "TVIALLUEE" -> "Total Value").

COLUMNS TO REPAIR:
{json.dumps(samples_info, indent=2)}

Return ONLY a JSON object mapping the damaged header to its repaired name. Example:
{{
  "QTYTTT": "Quantity",
  "TVIALLUEE": "Total Value"
}}
"""
            from analytics.utils.llm_client import generate_content_safe
            res_text = generate_content_safe(client, prompt, json_mode=True)
            parsed_llm = json.loads(res_text)
            for h in low_confidence_headers:
                if h in parsed_llm:
                    repaired_map[h] = parsed_llm[h]
                else:
                    repaired_map[h] = clean_header_heuristically(h)
        except Exception as e:
            print(f"[Header Repair LLM] Failed: {e}. Falling back to default format.")
            for h in low_confidence_headers:
                repaired_map[h] = clean_header_heuristically(h)
    else:
        # Default fallback
        for h in low_confidence_headers:
            repaired_map[h] = clean_header_heuristically(h)

    return repaired_map
