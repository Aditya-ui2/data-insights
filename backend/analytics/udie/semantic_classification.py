import re
import json
from typing import List, Dict, Any

# Mapping criteria (Ordered logically: dimensions/categories first, then specific identifiers, then financial metrics)
CLASSIFICATION_RULES = [
    # Primary Key / ID
    ("primary_key", r"^id$|^pk$|^uuid$|^guid$", "Unique row index identifier", "Do not graph, use for row level reference"),
    
    # Dimensions (High priority names and places)
    ("customer", r"customer|client|buyer|grahak|patron", "Customer name or profile field", "Use as grouping dimension for leaderboards and sales share"),
    ("employee", r"employee|staff|runner|agent|rep|salesperson|karmachari|manager", "Staff member or representative name", "Use as grouping dimension for employee performance charts"),
    ("supplier", r"supplier|vendor|distributor|merchant|apurtikarta", "Third-party vendor or supplier entity", "Use as dimension for procurement and cost splits"),
    ("geography", r"city|state|region|country|location|address|lat|long|desh|shehar|pradesh|pata|zone", "Geographic area or spatial coordinates", "Use as spatial dimension for map overlays and regional splits"),
    ("product", r"product|item|sku|maal|samaan|goods|material", "Product or item name", "Use as main dimension for sales breakdowns"),
    ("department", r"dept|department|vibhag|division|vertical", "Internal team or department unit", "Use as main grouping dimension for cost or performance charts"),
    
    # Time
    ("time", r"date|time|timestamp|created|updated|period|samay|tarikh|year|month|day", "Chronological timestamp marker", "Use as horizontal axis in line/area trend timelines"),
    
    # Categorical (High priority types, modes, status)
    ("payment", r"payment_mode|pay_type|mode|card_type", "Method of transaction payment", "Use as category dimension for payment distribution analysis"),
    ("status", r"status|state|priority|stage|level", "Operational stage indicator", "Use as grouping dimension for process and lifecycle charts"),
    ("category", r"category|varg|type|group|class|segment", "Broad sorting classification", "Use as primary grouping dimension in bar and pie charts"),
    
    # Specific Identifiers (avoiding matching broad words like 'bill')
    ("identifier", r"code|key|ref|serial|sno|sl_no|\bno\b|_no$|phone|mobile|email|card|barcode|\bbill_no\b|\binvoice_no\b|\bchallan_no\b", "Entity code or transactional identifier", "Do not graph, use for filtering and uniqueness counts"),
    
    # Financial Metrics (Low priority, matched after categories/dimensions)
    ("revenue", r"amount|amt|price|revenue|sales|salary|incentive|commission|billing|\bpayment_val\b|\bpayment_amt\b|tax|gst|vat|rate|raashi|bikri|faida|total_value", "Inflow financial value or metric", "Use as summary aggregation targets in charts"),
    ("expense", r"cost|expense|spending|purchase|discount|chhoot|kharch|kharcha|loss|nuksan", "Outflow financial cost or value", "Use as cost breakdown metric in Pareto or bar charts"),
    ("profit", r"profit|margin|earnings|net_income|gain|savings", "Net earnings metrics", "Use as primary business value KPI or secondary series in trendlines"),
    
    # Quantitative
    ("quantity", r"quantity|qty|volume|units|count|pcs|pieces|matra|vajan|weight", "Physical count or quantity measurement", "Use as target metric in distribution and performance charts"),
    
    # Boolean
    ("boolean", r"is_|has_|active|enabled|completed", "Binary flag status", "Use as filter column or segmentation slice"),
    
    # Remarks / Text
    ("text", r"notes|remarks|feedback|description|tippani|details|comments", "Unstructured descriptive remarks", "Use for plain text search or detail view lists")
]

def classify_columns(headers: List[str], col_types: Dict[str, str], rows: List[Dict[str, Any]], client = None) -> Dict[str, Dict[str, Any]]:
    """
    Module 6: Semantic Column Classification.
    Labels every column with a business semantic type, description, confidence, and recommended usage.
    Utilizes Gemini Flash dynamic resolution if client is available.
    """
    # 1. Try Gemini Flash dynamic column resolution
    if client:
        try:
            print("[Semantic Classification AI] Classifying columns dynamically using Gemini Flash...", flush=True)
            low_confidence_cols = []
            for col in headers:
                col_type = col_types.get(col, "text")
                samples = []
                for r in rows[:15]:
                    val = r.get(col)
                    if val is not None and str(val).strip() != "":
                        samples.append(str(val)[:40])
                        if len(samples) >= 3:
                            break
                low_confidence_cols.append({
                    "columnName": col,
                    "dataType": col_type,
                    "samples": samples
                })
                
            prompt = f"""
You are an expert database architect and data warehouse schema designer. Analyze these columns from a dataset and determine their correct business semantic roles.
Your task is to classify each column into one of these strict roles:
- "Identifier" (Unique row indexes, entity codes, mobile numbers, phone numbers, email addresses, invoice/bill numbers, challan numbers, barcodes)
- "Measure" (Physical counts, raw quantities, volume, weight, item sold counts)
- "Currency" (Financial inflow/outflow values, prices, amounts, revenue, sales, cost, expense, profit, salaries, incentives, taxes, billing values)
- "Percentage" (Any rates, ratios, percentages, margins, shares)
- "Dimension" (Names of clients, customers, employees, managers, runners, suppliers, cities, states, locations, addresses, product/item names)
- "Category" (Broad categories, departments, transaction types, payment modes, card types, operational status, priority levels, stages)
- "Date" (Chronological dates, timestamps, years, months, days)
- "Boolean" (Binary flags like True/False, Yes/No, Active/Inactive, Is/Has status)
- "Remarks" (Unstructured comments, notes, remarks, descriptions, feedback columns)
- "Text" (General text columns that do not fit into the roles above)

IMPORTANT: Never classify unique row indexes, serial numbers, phone numbers, zip codes, or transactional codes as Measure or Currency. They must be classified as Identifier to avoid creating meaningless charts.

COLUMNS TO CLASSIFY:
{json.dumps(low_confidence_cols, indent=2)}

Return ONLY a JSON response mapping each original column name to a JSON object with:
{{
  "category": "One of the strict roles listed above",
  "confidence": 0.95,
  "meaning": "A brief explanation of the column meaning",
  "recommendedUsage": "A brief recommended analytical usage"
}}
"""
            from analytics.utils.llm_client import generate_content_safe
            res_text = generate_content_safe(client, prompt, json_mode=True)
            ai_resolved = json.loads(res_text)
            if isinstance(ai_resolved, list):
                temp_dict = {}
                for item in ai_resolved:
                    col_name = item.get("columnName") or item.get("originalHeader") or item.get("column") or item.get("name")
                    if col_name:
                        temp_dict[col_name] = item
                ai_resolved = temp_dict
                
            classifications = {}
            for col in headers:
                info = ai_resolved.get(col, {}) if isinstance(ai_resolved, dict) else {}
                cat = info.get("category", "Text")
                # Validate role
                valid_roles = ["Identifier", "Measure", "Currency", "Percentage", "Dimension", "Category", "Date", "Boolean", "Text", "Remarks"]
                if cat not in valid_roles:
                    cat = "Text"
                
                # Enforce numeric metric classification to prevent LLM mistaking it as Dimension or Date
                col_type = col_types.get(col, "text")
                col_lower = col.lower().replace(" ", "_").replace("-", "_")
                
                metric_keywords = ["total", "sum", "average", "avg", "target", "value", "quantity", "qty", "amount", "amt", "revenue", "price", "cost", "net", "balance", "₹", "rate", "feet", "sq_ft", "square_feet"]
                id_keywords = ["id", "code", "key", "ref", "serial", "sno", "sl_no", "no", "phone", "mobile", "zip"]
                
                is_metric_indicator = any(kw in col_lower for kw in metric_keywords)
                is_id_indicator = any(kw in col_lower for kw in id_keywords)
                
                # Enforce Remarks role for free-text comments and remarks columns
                remarks_keywords = ["remark", "note", "comment", "description", "feedback", "details"]
                if any(kw in col_lower for kw in remarks_keywords) and not any(kw in col_lower for kw in ["name", "id", "code"]):
                    cat = "Remarks"
                else:
                    if col_type == "numeric" and (is_metric_indicator or not is_id_indicator):
                        if cat not in ["Measure", "Currency", "Percentage", "Identifier"]:
                            if any(k in col_lower for k in ["qty", "qtyttt", "quantity", "volume", "count", "units", "pieces", "pcs", "weight", "vajan", "feet", "sq_ft", "square_feet", "target"]):
                                cat = "Measure"
                            else:
                                cat = "Currency"
                                if any(term in col_lower for term in ["percent", "pct", "rate", "ratio", "share"]):
                                    cat = "Percentage"
                
                classifications[col] = {
                    "category": cat,
                    "confidence": float(info.get("confidence", 0.90)),
                    "meaning": info.get("meaning", "Business semantic column"),
                    "recommendedUsage": info.get("recommendedUsage", "Use in tables and charts")
                }
            return classifications
        except Exception as e:
            print(f"[Semantic Classification AI] Gemini classification failed: {e}. Falling back to rule-based.")

    # 2. Rule-based Fallback
    classifications = {}
    for col in headers:
        col_type = col_types.get(col, "text")
        col_lower = col.lower().replace(" ", "_").replace("-", "_")
        
        assigned_cat = "unknown"
        confidence = 0.50
        meaning = "Unknown column content"
        rec_usage = "Inspect values to determine use"
        
        # Extract sample values to detect actual IDs, serial numbers, phone numbers
        vals = [r.get(col) for r in rows if r.get(col) is not None]
        
        # Check if values are mostly incremental digits or unique IDs
        is_all_int = False
        int_vals = []
        if vals:
            try:
                for v in vals[:30]:
                    v_str = str(v).strip()
                    if v_str.isdigit():
                        int_vals.append(int(v_str))
                if len(int_vals) >= len(vals[:30]) * 0.8:
                    is_all_int = True
            except:
                pass
                
        is_incremental = False
        if is_all_int and len(int_vals) > 2:
            diffs = [int_vals[i] - int_vals[i-1] for i in range(1, len(int_vals))]
            if all(d == 1 for d in diffs):
                is_incremental = True
                
        is_likely_phone = False
        if vals:
            digits_lens = [len(re.sub(r'\D', '', str(v))) for v in vals[:15]]
            if len(digits_lens) > 0 and all(l in [10, 11, 12] for l in digits_lens if l > 0) and sum(1 for l in digits_lens if l in [10, 11, 12]) >= len(digits_lens) * 0.7:
                is_likely_phone = True
                
        # Force unstructured remarks / text columns to be classified as Text/Remarks
        remarks_keywords = ["remark", "note", "comment", "description", "feedback", "details"]
        if any(kw in col_lower for kw in remarks_keywords) and not any(kw in col_lower for kw in ["name", "id", "code"]):
            assigned_cat = "text"
            meaning = "Unstructured descriptive remarks or comments"
            rec_usage = "Display in raw details tables"
            confidence = 0.95
        elif is_incremental or is_likely_phone or any(kw in col_lower for kw in ["phone", "mobile", "contact", "serial", "sno", "sl_no"]):
            assigned_cat = "identifier"
            meaning = "Entity code or transactional identifier"
            rec_usage = "Do not graph, use for filtering and uniqueness counts"
            confidence = 0.95
        else:
            # Check if the column is numeric and contains metric indicators or does not contain ID indicators
            metric_keywords = ["total", "sum", "average", "avg", "target", "value", "quantity", "qty", "amount", "amt", "revenue", "price", "cost", "net", "balance", "₹", "rate", "feet", "sq_ft", "square_feet"]
            id_keywords = ["id", "code", "key", "ref", "serial", "sno", "sl_no", "no", "phone", "mobile", "zip"]
            
            is_metric_indicator = any(kw in col_lower for kw in metric_keywords)
            is_id_indicator = any(kw in col_lower for kw in id_keywords)
            
            if col_type == "numeric" and (is_metric_indicator or not is_id_indicator):
                # Force numeric metric classification to prevent mistaking it as Dimension (e.g. Total Maal Bika) or Date (e.g. Monthly Target)
                if any(k in col_lower for k in ["qty", "qtyttt", "quantity", "volume", "count", "units", "pieces", "pcs", "weight", "vajan", "feet", "sq_ft", "square_feet", "target"]):
                    assigned_cat = "quantity"
                    meaning = "Numerical quantity/volume metric"
                    rec_usage = "Use for summary metric aggregations"
                else:
                    assigned_cat = "revenue"
                    if any(term in col_lower for term in ["cost", "expense", "purchase", "loss", "nuksan", "kharch", "kharcha"]):
                        assigned_cat = "expense"
                    elif any(term in col_lower for term in ["profit", "margin", "gain", "earnings"]):
                        assigned_cat = "profit"
                    meaning = "Numerical financial metric"
                    rec_usage = "Use for financial values and aggregations"
                confidence = 0.95
            else:
                for cat, pattern, desc, usage in CLASSIFICATION_RULES:
                    if re.search(pattern, col_lower):
                        assigned_cat = cat
                        confidence = 0.90
                        meaning = desc
                        rec_usage = usage
                        break
                
        # Refine based on data type and values
        if assigned_cat == "unknown":
            if col_type == "numeric":
                assigned_cat = "quantity" if any(k in col_lower for k in ["qty", "count", "num"]) else "revenue"
                confidence = 0.65
                meaning = "Numerical business metric"
                rec_usage = "Use for summary metric aggregations"
            elif col_type == "date":
                assigned_cat = "time"
                confidence = 0.85
                meaning = "Inferred chronological date field"
                rec_usage = "Use as time axis in growth trends"
            else:
                samples = [str(r.get(col) or "").strip().lower() for r in rows[:20]]
                unique_ratio = len(set(samples)) / len(samples) if samples else 1.0
                
                boolean_vals = {"true", "false", "yes", "no", "active", "inactive"}
                if samples and all(s in boolean_vals for s in samples if s):
                    assigned_cat = "boolean"
                    confidence = 0.80
                    meaning = "Logical state flag"
                    rec_usage = "Use to filter and segment charts"
                elif unique_ratio > 0.8 and any(len(s) > 30 for s in samples):
                    assigned_cat = "text"
                    confidence = 0.70
                    meaning = "Free text remarks or description"
                    rec_usage = "Display in raw details tables"
                else:
                    assigned_cat = "category"
                    confidence = 0.60
                    meaning = "Text grouping category"
                    rec_usage = "Use as categorizing dimension in charts"

        # Map to Rule 4 target roles
        final_role = "Unknown"
        if assigned_cat in ["primary_key", "identifier"]:
            final_role = "Identifier"
        elif assigned_cat == "quantity":
            final_role = "Measure"
        elif assigned_cat in ["revenue", "expense", "profit"]:
            final_role = "Currency"
            if any(term in col_lower for term in ["percent", "pct", "rate", "ratio", "share"]):
                final_role = "Percentage"
        elif assigned_cat in ["customer", "employee", "supplier", "geography", "department", "product"]:
            final_role = "Dimension"
        elif assigned_cat in ["category", "status", "payment"]:
            final_role = "Category"
        elif assigned_cat == "time":
            final_role = "Date"
        elif assigned_cat == "boolean":
            final_role = "Boolean"
        elif assigned_cat == "text":
            final_role = "Text"
            if any(term in col_lower for term in ["remark", "note", "comment"]):
                final_role = "Remarks"
        elif assigned_cat == "remarks":
            final_role = "Remarks"

        classifications[col] = {
            "category": final_role,
            "confidence": round(confidence, 2),
            "meaning": meaning,
            "recommendedUsage": rec_usage
        }
        
    return classifications
