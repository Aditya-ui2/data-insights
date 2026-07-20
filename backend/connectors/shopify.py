import httpx
from datetime import datetime, timedelta
from connectors.sdk import BaseConnector

class ShopifyConnector(BaseConnector):
    """
    Shopify Enterprise Connector implementing BaseConnector lifecycle.
    """
    def authenticate(self) -> dict:
        shop_url = self.config.get("shopUrl") or self.config.get("host")
        access_token = self.config.get("accessToken") or self.config.get("database") or self.config.get("password")
        
        if not shop_url or not access_token:
            raise ValueError("Missing Shop URL or Admin Access Token.")
        return {"authenticated": True, "shopUrl": shop_url}

    def test_connection(self) -> dict:
        try:
            self.authenticate()
            shop_url = self.config.get("shopUrl") or self.config.get("host")
            access_token = self.config.get("accessToken") or self.config.get("database") or self.config.get("password")
            if not access_token or "mock" in access_token:
                return {"success": True, "message": "Sandbox Shopify connected successfully."}
                
            # Real endpoint check using SDK retry wrapper
            url = f"https://{shop_url}/admin/api/2024-01/shop.json"
            headers = {"X-Shopify-Access-Token": access_token}
            self.request_with_retry("GET", url, headers=headers)
            return {"success": True, "message": "Connected to Shopify API."}
        except Exception as e:
            return {"success": False, "message": f"Connection failed: {str(e)}"}

    def fetchModulesOrObjects(self) -> list:
        return [
            "customers",
            "orders",
            "products",
            "automatic_discount_nodes",
            "automatic_discount_saved_searches",
            "code_discount_nodes",
            "code_discount_saved_searches",
            "collection_saved_searches",
            "collections",
            "deletion_events",
            "delivery_profiles",
            "discount_redeem_code_saved_searches",
            "draft_order_saved_searches",
            "draft_orders",
            "file_saved_searches",
            "files",
            "gift_cards",
            "inventory_items",
            "line_items",
            "locations",
            "locations_available_for_delivery_profiles",
            "market_catalogs",
            "market_catalogs_markets",
            "marketing_activities",
            "order_saved_searches"
        ]

    def fetchFields(self, object_name: str) -> dict:
        schemas = {
            "customers": ["id", "first_name", "last_name", "email", "phone", "state", "total_spent", "orders_count", "verified_email", "tax_exempt", "tags", "created_at"],
            "orders": ["id", "customer_id", "email", "total_price", "subtotal_price", "total_tax", "total_discounts", "financial_status", "fulfillment_status", "currency", "created_at", "updated_at"],
            "products": ["id", "title", "body_html", "vendor", "product_type", "handle", "status", "published_scope", "tags", "created_at", "updated_at"],
            "automatic_discount_nodes": ["id", "title", "status", "starts_at", "ends_at", "summary", "app_discount_type", "created_at"],
            "automatic_discount_saved_searches": ["id", "name", "query", "created_at", "updated_at"],
            "code_discount_nodes": ["id", "code", "status", "starts_at", "ends_at", "usage_limit", "app_discount_type", "created_at"],
            "code_discount_saved_searches": ["id", "name", "query", "created_at", "updated_at"],
            "collection_saved_searches": ["id", "name", "query", "created_at", "updated_at"],
            "collections": ["id", "title", "handle", "description", "published_scope", "sort_order", "template_suffix", "updated_at"],
            "deletion_events": ["id", "subject_id", "subject_type", "occurred_at"],
            "delivery_profiles": ["id", "name", "profile_type", "active", "created_at", "updated_at"],
            "discount_redeem_code_saved_searches": ["id", "name", "query", "created_at", "updated_at"],
            "draft_order_saved_searches": ["id", "name", "query", "created_at", "updated_at"],
            "draft_orders": ["id", "note", "email", "taxes_included", "currency", "subtotal_price", "total_price", "status", "created_at"],
            "file_saved_searches": ["id", "name", "query", "created_at", "updated_at"],
            "files": ["id", "alt", "content_type", "original_source_url", "file_status", "created_at"],
            "gift_cards": ["id", "initial_value", "balance", "currency", "code_last_characters", "disabled_at", "expires_on", "created_at"],
            "inventory_items": ["id", "sku", "cost", "tracked", "requires_shipping", "province_code_of_origin", "created_at", "updated_at"],
            "line_items": ["id", "variant_id", "title", "quantity", "price", "grams", "sku", "fulfillment_status", "vendor"],
            "locations": ["id", "name", "address1", "address2", "city", "zip", "province", "country", "phone", "active", "localized_country_name"],
            "locations_available_for_delivery_profiles": ["id", "location_id", "profile_id", "available", "updated_at"],
            "market_catalogs": ["id", "name", "market_id", "status", "created_at"],
            "market_catalogs_markets": ["id", "market_name", "catalog_id", "currency", "status"],
            "marketing_activities": ["id", "status", "utm_campaign", "utm_source", "utm_medium", "budget", "spend", "created_at"],
            "order_saved_searches": ["id", "name", "query", "created_at", "updated_at"]
        }
        
        custom_fields = {
            "customers": ["custom_loyalty_tier", "custom_referred_by"],
            "orders": ["custom_shipping_instructions", "custom_gift_wrap"],
            "products": ["custom_manufacture_date", "custom_supplier_ref"]
        }
        
        return {
            "standard": schemas.get(object_name, ["id", "title", "status", "created_at"]),
            "custom": custom_fields.get(object_name, [])
        }

    def fetchData(self, object_name: str, fields: list, limit: int = 500) -> list:
        shop_url = self.config.get("shopUrl") or self.config.get("host")
        access_token = self.config.get("accessToken") or self.config.get("database") or self.config.get("password")
        is_sandbox = not access_token or "mock" in access_token

        if is_sandbox:
            raw_rows = self._get_sandbox_data(object_name)
            # Inject custom fields mock values dynamically at runtime
            for r in raw_rows:
                if object_name == "customers":
                    r["custom_loyalty_tier"] = "Gold VIP"
                    r["custom_referred_by"] = "Affiliate #88"
                elif object_name == "orders":
                    r["custom_shipping_instructions"] = "Leave at front door."
                    r["custom_gift_wrap"] = True
                elif object_name == "products":
                    r["custom_manufacture_date"] = "2026-03-12"
                    r["custom_supplier_ref"] = "SUP-998811"
            return raw_rows[:limit]
            
        # Real API request
        try:
            url = f"https://{shop_url}/admin/api/2024-01/{object_name}.json?limit={min(limit, 50)}"
            headers = {"X-Shopify-Access-Token": access_token}
            res = self.request_with_retry("GET", url, headers=headers)
            res_data = res.json()
            return res_data.get(object_name, [])[:limit]
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"[Shopify Sync Warning] API resource '{object_name}' not available on store: {str(e)}")
            # Return empty list on client errors/404/403/Unverified endpoints to keep sync resilient
            return []

    def schema_mapping(self, entity_name: str, raw_data: list) -> list:
        mapped = []
        for item in raw_data:
            if entity_name == "customers":
                raw_name = f"{item.get('first_name', '')} {item.get('last_name', '')}".strip()
                default_address = item.get("default_address", {}) or {}
                company = default_address.get("company")
                cust_id = str(item.get("id"))
                
                if raw_name:
                    name = raw_name
                elif company:
                    name = f"Customer ({company})"
                else:
                    name = f"Customer (*{cust_id[-4:]})" if len(cust_id) > 4 else f"Customer ({cust_id})"
                
                email = item.get("email")
                if not email:
                    email = "[Protected / Redacted]"
                    
                phone = item.get("phone")
                if not phone:
                    phone = "[Protected]"

                mapped.append({
                    "id": cust_id,
                    "first_name": item.get("first_name", ""),
                    "last_name": item.get("last_name", ""),
                    "display_name": name,
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "state": item.get("state", "enabled"),
                    "note": item.get("note"),
                    "verified_email": item.get("verified_email", True),
                    "tax_exempt": item.get("tax_exempt", False),
                    "multipass_identifier": item.get("multipass_identifier"),
                    "locale": item.get("locale", "en"),
                    "tags": item.get("tags", ""),
                    "created_at": item.get("created_at"),
                    "updated_at": item.get("updated_at"),
                    "amount_spent_amount": float(item.get("amount_spent_amount", 0.0) or 0.0),
                    "amount_spent_currency_code": item.get("amount_spent_currency_code", "USD"),
                    "default_address_address1": default_address.get("address1", ""),
                    "default_address_address2": default_address.get("address2", ""),
                    "default_address_city": default_address.get("city", ""),
                    "default_address_province": default_address.get("province", ""),
                    "default_address_country": default_address.get("country", ""),
                    "default_address_zip": default_address.get("zip", ""),
                    "last_order_id": item.get("last_order_id"),
                    "last_order_name": item.get("last_order_name"),
                    "last_order_created_at": item.get("last_order_created_at"),
                    "marketing_consent_state": item.get("marketing_consent_state", "subscribed"),
                    "marketing_consent_opt_in_level": item.get("marketing_consent_opt_in_level", "single_opt_in"),
                    "can_delete": item.get("can_delete", True),
                    "data_sale_opt_out": item.get("data_sale_opt_out", False),
                    "legacy_resource_id": cust_id,
                    "lifetime_duration": item.get("lifetime_duration", "0"),
                    "mergeable": item.get("mergeable", True),
                    "custom_loyalty_tier": item.get("custom_loyalty_tier"),
                    "custom_referred_by": item.get("custom_referred_by")
                })
            elif entity_name == "orders":
                mapped.append({
                    "id": str(item.get("id")),
                    "customer_id": str(item.get("customer", {}).get("id")) if item.get("customer") else "guest",
                    "total_amount": float(item.get("total_price", 0.0)),
                    "subtotal": float(item.get("subtotal_price", 0.0)),
                    "tax_amount": float(item.get("total_tax", 0.0)),
                    "discount_amount": float(item.get("total_discounts", 0.0)),
                    "status": item.get("financial_status", "paid"),
                    "created_at": item.get("created_at"),
                    "item_count": len(item.get("line_items", [])) if item.get("line_items") else 1,
                    "custom_shipping_instructions": item.get("custom_shipping_instructions"),
                    "custom_gift_wrap": item.get("custom_gift_wrap")
                })
            elif entity_name == "products":
                mapped.append({
                    "id": str(item.get("id")),
                    "title": item.get("title", "Unnamed Product"),
                    "sku": item.get("variants", [{}])[0].get("sku") if item.get("variants") else None,
                    "category": item.get("product_type"),
                    "inventory_quantity": item.get("variants", [{}])[0].get("inventory_quantity", 0) if item.get("variants") else 0,
                    "price": float(item.get("variants", [{}])[0].get("price", 0.0)) if item.get("variants") else 0.0,
                    "custom_manufacture_date": item.get("custom_manufacture_date"),
                    "custom_supplier_ref": item.get("custom_supplier_ref")
                })
            else:
                mapped.append(item)
        return mapped

    def _get_sandbox_data(self, entity_name: str) -> list:
        now = datetime.utcnow()
        if entity_name == "customers":
            customers = [
                {"id": 1001, "first_name": "Aarav", "last_name": "Sharma", "email": "aarav.sharma@gmail.com", "phone": "9876543210", "created_at": (now - timedelta(days=30)).isoformat(), "amount_spent_amount": 1250.0, "amount_spent_currency_code": "USD", "default_address": {"address1": "123 MG Road", "city": "Mumbai", "country": "India", "zip": "400001"}, "last_order_id": "5001", "last_order_name": "#1001", "last_order_created_at": (now - timedelta(days=10)).isoformat()},
                {"id": 1002, "first_name": "Diya", "last_name": "Patel", "email": "diya.patel@gmail.com", "phone": "9812345670", "created_at": (now - timedelta(days=28)).isoformat(), "amount_spent_amount": 890.00, "amount_spent_currency_code": "USD", "default_address": {"address1": "456 Ring Road", "city": "Surat", "country": "India", "zip": "395001"}, "last_order_id": "5002", "last_order_name": "#1002", "last_order_created_at": (now - timedelta(days=9)).isoformat()},
                {"id": 1003, "first_name": "Kabir", "last_name": "Mehta", "email": "kabir.mehta@yahoo.com", "phone": "9823456789", "created_at": (now - timedelta(days=25)).isoformat(), "amount_spent_amount": 420.00, "amount_spent_currency_code": "USD", "default_address": {"address1": "789 Park St", "city": "Kolkata", "country": "India", "zip": "700016"}, "last_order_id": "5003", "last_order_name": "#1003", "last_order_created_at": (now - timedelta(days=8)).isoformat()},
                {"id": 1004, "first_name": "Isha", "last_name": "Rao", "email": "isha.rao@gmail.com", "phone": "9834567890", "created_at": (now - timedelta(days=20)).isoformat(), "amount_spent_amount": 150.00, "amount_spent_currency_code": "USD", "default_address": {"address1": "101 MG Road", "city": "Mumbai", "country": "India", "zip": "400001"}, "last_order_id": "5004", "last_order_name": "#1004", "last_order_created_at": (now - timedelta(days=7)).isoformat()},
                {"id": 1005, "first_name": "Aditya", "last_name": "Singh", "email": "aditya.singh@outlook.com", "phone": "9845678901", "created_at": (now - timedelta(days=15)).isoformat(), "amount_spent_amount": 3500.00, "amount_spent_currency_code": "USD", "default_address": {"address1": "202 Ring Road", "city": "Surat", "country": "India", "zip": "395001"}, "last_order_id": "5005", "last_order_name": "#1005", "last_order_created_at": (now - timedelta(days=6)).isoformat()},
                {"id": 1006, "first_name": "Riya", "last_name": "Sen", "email": "riya.sen@gmail.com", "phone": "9856789012", "created_at": (now - timedelta(days=12)).isoformat(), "amount_spent_amount": 680.00, "amount_spent_currency_code": "USD", "default_address": {"address1": "303 Park St", "city": "Kolkata", "country": "India", "zip": "700016"}, "last_order_id": "5006", "last_order_name": "#1006", "last_order_created_at": (now - timedelta(days=5)).isoformat()},
                {"id": 1007, "first_name": "Rohan", "last_name": "Verma", "email": "rohan.verma@gmail.com", "phone": "9867890123", "created_at": (now - timedelta(days=10)).isoformat(), "amount_spent_amount": 1200.00, "amount_spent_currency_code": "USD", "default_address": {"address1": "404 MG Road", "city": "Mumbai", "country": "India", "zip": "400001"}, "last_order_id": "5007", "last_order_name": "#1007", "last_order_created_at": (now - timedelta(days=4)).isoformat()},
                {"id": 1008, "first_name": "Pooja", "last_name": "Hegde", "email": "pooja.hegde@gmail.com", "phone": "9878901234", "created_at": (now - timedelta(days=8)).isoformat(), "amount_spent_amount": 250.00, "amount_spent_currency_code": "USD", "default_address": {"address1": "505 Ring Road", "city": "Surat", "country": "India", "zip": "395001"}, "last_order_id": "5008", "last_order_name": "#1008", "last_order_created_at": (now - timedelta(days=3)).isoformat()}
            ]
            first_names = ["Arjun", "Ananya", "Rahul", "Priya", "Amit", "Sneha", "Karan", "Kavya", "Vijay", "Neha", "Raj", "Sanjay", "Shreya", "Sunil", "Ritu", "Deepak", "Jyoti", "Manish", "Divya"]
            last_names = ["Kumar", "Sharma", "Singh", "Patel", "Gupta", "Joshi", "Verma", "Reddy", "Nair", "Rao", "Mehta", "Sen", "Malhotra", "Banu", "Das", "Choudhury", "Roy", "Bose", "Mishra", "Pandey"]
            for i in range(1, 31):
                cid = 1010 + i
                fn = first_names[i % len(first_names)]
                ln = last_names[i % len(last_names)]
                customers.append({
                    "id": cid,
                    "first_name": fn,
                    "last_name": ln,
                    "email": f"{fn.lower()}.{ln.lower()}{cid}@shopify-mock.com",
                    "phone": f"98765{10000+cid}",
                    "created_at": (now - timedelta(days=30 + i)).isoformat(),
                    "amount_spent_amount": float(100 * i),
                    "amount_spent_currency_code": "USD",
                    "default_address": {"address1": f"{100+i} Baker St", "city": "London", "country": "UK", "zip": "NW1 6XE"},
                    "last_order_id": f"5{100+i}",
                    "last_order_name": f"#{100+i}",
                    "last_order_created_at": (now - timedelta(days=30 + i)).isoformat()
                })
            return customers
        elif entity_name == "orders":
            orders = [
                {"id": 5001, "customer": {"id": 1001}, "total_price": "2499.00", "subtotal_price": "2299.00", "total_tax": "200.00", "total_discounts": "0.00", "financial_status": "paid", "created_at": (now - timedelta(days=10)).isoformat(), "line_items": [{}, {}]},
                {"id": 5002, "customer": {"id": 1002}, "total_price": "1599.00", "subtotal_price": "1499.00", "total_tax": "100.00", "total_discounts": "100.00", "financial_status": "paid", "created_at": (now - timedelta(days=9)).isoformat(), "line_items": [{}]},
                {"id": 5003, "customer": {"id": 1003}, "total_price": "4999.00", "subtotal_price": "4599.00", "total_tax": "400.00", "total_discounts": "0.00", "financial_status": "paid", "created_at": (now - timedelta(days=8)).isoformat(), "line_items": [{}]},
                {"id": 5004, "customer": {"id": 1004}, "total_price": "899.00", "subtotal_price": "799.00", "total_tax": "100.00", "total_discounts": "0.00", "financial_status": "pending", "created_at": (now - timedelta(days=7)).isoformat(), "line_items": [{}]},
                {"id": 5005, "customer": {"id": 1005}, "total_price": "12500.00", "subtotal_price": "11500.00", "total_tax": "1000.00", "total_discounts": "500.00", "financial_status": "paid", "created_at": (now - timedelta(days=6)).isoformat(), "line_items": [{}, {}]},
                {"id": 5006, "customer": {"id": 1001}, "total_price": "3500.00", "subtotal_price": "3200.00", "total_tax": "300.00", "total_discounts": "0.00", "financial_status": "paid", "created_at": (now - timedelta(days=5)).isoformat(), "line_items": [{}]},
                {"id": 5007, "customer": {"id": 1006}, "total_price": "1200.00", "subtotal_price": "1100.00", "total_tax": "100.00", "total_discounts": "200.00", "financial_status": "refunded", "created_at": (now - timedelta(days=4)).isoformat(), "line_items": [{}]},
                {"id": 5008, "customer": {"id": 1007}, "total_price": "8999.00", "subtotal_price": "8599.00", "total_tax": "400.00", "total_discounts": "0.00", "financial_status": "paid", "created_at": (now - timedelta(days=3)).isoformat(), "line_items": [{}]},
                {"id": 5009, "customer": {"id": 1008}, "total_price": "1299.00", "subtotal_price": "1299.00", "total_tax": "0.00", "total_discounts": "0.00", "financial_status": "paid", "created_at": (now - timedelta(days=2)).isoformat(), "line_items": [{}]},
                {"id": 5010, "customer": {"id": 1009}, "total_price": "24999.00", "subtotal_price": "23999.00", "total_tax": "1000.00", "total_discounts": "1000.00", "financial_status": "paid", "created_at": (now - timedelta(days=1)).isoformat(), "line_items": [{}, {}, {}]}
            ]
            import random
            statuses = ["paid", "pending", "refunded"]
            prices = [899.00, 1299.00, 1599.00, 2499.00, 3500.00, 4999.00, 7999.00, 8999.00, 12500.00, 24999.00]
            for i in range(1, 51):
                oid = 5010 + i
                cid = 1001 + (i % 35)
                price = prices[i % len(prices)]
                tax = price * 0.08
                subtotal = price - tax
                orders.append({
                    "id": oid,
                    "customer": {"id": cid},
                    "total_price": f"{price:.2f}",
                    "subtotal_price": f"{subtotal:.2f}",
                    "total_tax": f"{tax:.2f}",
                    "total_discounts": "0.00",
                    "financial_status": statuses[i % len(statuses)],
                    "created_at": (now - timedelta(days=10 + i)).isoformat(),
                    "line_items": [{}]
                })
            return orders
        elif entity_name == "products":
            return [
                {"id": 2001, "title": "Wireless Bluetooth Earbuds", "product_type": "Electronics", "variants": [{"sku": "SKU-EARBUDS-01", "inventory_quantity": 142, "price": "2499.00"}]},
                {"id": 2002, "title": "Ergonomic Office Chair", "product_type": "Furniture", "variants": [{"sku": "SKU-CHAIR-04", "inventory_quantity": 8, "price": "8999.00"}]},
                {"id": 2003, "title": "Mechanical Gaming Keyboard", "product_type": "Electronics", "variants": [{"sku": "SKU-KB-02", "inventory_quantity": 15, "price": "4999.00"}]},
                {"id": 2004, "title": "Ultra-Wide Gaming Monitor", "product_type": "Electronics", "variants": [{"sku": "SKU-MON-09", "inventory_quantity": 5, "price": "24999.00"}]},
                {"id": 2005, "title": "USB-C Multi-Port Adapter", "product_type": "Accessories", "variants": [{"sku": "SKU-ADP-07", "inventory_quantity": 120, "price": "1299.00"}]},
                {"id": 2006, "title": "Portable SSD 1TB", "product_type": "Storage", "variants": [{"sku": "SKU-SSD-12", "inventory_quantity": 45, "price": "7999.00"}]},
                {"id": 2007, "title": "Smart Fitness Watch", "product_type": "Wearables", "variants": [{"sku": "SKU-WATCH-03", "inventory_quantity": 60, "price": "5499.00"}]},
                {"id": 2008, "title": "Noise Cancelling Headphones", "product_type": "Electronics", "variants": [{"sku": "SKU-HEAD-05", "inventory_quantity": 25, "price": "14999.00"}]},
                {"id": 2009, "title": "Minimalist Leather Wallet", "product_type": "Accessories", "variants": [{"sku": "SKU-WALL-02", "inventory_quantity": 80, "price": "1899.00"}]},
                {"id": 2010, "title": "Stainless Steel Water Bottle", "product_type": "Home", "variants": [{"sku": "SKU-BOTT-08", "inventory_quantity": 150, "price": "999.00"}]}
            ]
        else:
            # Generate mock sandbox records with ALL standard fields of the requested Shopify resource
            fields_info = self.fetchFields(entity_name)
            cols = fields_info["standard"]
            mock_records = []
            for i in range(1, 6):
                rec = {}
                for col in cols:
                    if col == "id" or col.endswith("_id") or col.endswith("_key"):
                        rec[col] = f"id-{entity_name}-{100+i}"
                    elif col == "created_at" or col == "updated_at" or col == "occurred_at" or col == "starts_at" or col == "ends_at":
                        rec[col] = (now - timedelta(days=i)).isoformat()
                    elif col == "status" or col == "active" or col == "file_status":
                        rec[col] = "active" if i % 2 == 1 else "inactive"
                    elif col == "price" or col == "total_price" or col == "subtotal_price" or col == "cost" or col == "budget" or col == "spend" or col == "initial_value" or col == "balance":
                        rec[col] = float(49.99 * i)
                    elif col == "quantity" or col == "inventory_quantity" or col == "orders_count" or col == "item_count" or col == "grams" or col == "stock_level" or col == "usage_limit":
                        rec[col] = int(10 * i)
                    elif col == "query":
                        rec[col] = f"created_at:>={now.date()}"
                    else:
                        rec[col] = f"Mock {col.replace('_', ' ').title()} {i}"
                mock_records.append(rec)
            return mock_records

    def writeBack(self, object_name: str, record_data: dict) -> dict:
        shop_url = self.config.get("shopUrl") or self.config.get("host")
        access_token = self.config.get("accessToken") or self.config.get("database") or self.config.get("password")
        is_sandbox = not access_token or "mock" in access_token

        record_id = record_data.get("id")
        if not record_id:
            raise ValueError("Missing record ID for writeback.")

        if is_sandbox:
            # Sandbox write-back: update local JSON file cache
            import json
            import os
            
            integration_id = self.config.get("integrationId")
            if not integration_id:
                raise ValueError("Missing integration ID in connector configuration.")
                
            json_path = os.path.join(os.getcwd(), "backend", "data", f"conn_{integration_id}.connector.json")
            if not os.path.exists(json_path):
                raise FileNotFoundError("Mock connector JSON dataset not found on disk.")
                
            with open(json_path, "r") as f:
                data = json.load(f)
                
            if object_name not in data:
                data[object_name] = []
                
            # Find and update record
            updated = False
            for idx, item in enumerate(data[object_name]):
                if str(item.get("id")) == str(record_id):
                    # Keep original fields but update modified fields from record_data
                    for k, v in record_data.items():
                        # Handle first_name / last_name mapping for customers name
                        if object_name == "customers" and k == "name" and v:
                            parts = str(v).split(" ")
                            item["first_name"] = parts[0] if len(parts) > 0 else ""
                            item["last_name"] = " ".join(parts[1:]) if len(parts) > 1 else ""
                        elif object_name == "products" and k == "price":
                            if "variants" in item and len(item["variants"]) > 0:
                                item["variants"][0]["price"] = str(v)
                        elif object_name == "products" and k == "inventory_quantity":
                            if "variants" in item and len(item["variants"]) > 0:
                                item["variants"][0]["inventory_quantity"] = int(v)
                        elif object_name == "products" and k == "sku":
                            if "variants" in item and len(item["variants"]) > 0:
                                item["variants"][0]["sku"] = str(v)
                        else:
                            item[k] = v
                    updated = True
                    break
                    
            if not updated:
                # Add as new record if not found
                data[object_name].append(record_data)
                
            with open(json_path, "w") as f:
                json.dump(data, f, indent=4)
                
            return {"success": True, "message": "Updated sandbox record successfully."}
            
        else:
            # Real Shopify API write-back!
            # Customers: PUT /admin/api/2024-01/customers/{customer_id}.json
            # Products: PUT /admin/api/2024-01/variants/{variant_id}.json
            # Orders: PUT /admin/api/2024-01/orders/{order_id}.json
            
            headers = {"X-Shopify-Access-Token": access_token}
            
            if object_name == "customers":
                url = f"https://{shop_url}/admin/api/2024-01/customers/{record_id}.json"
                name = record_data.get("name", "")
                parts = name.split(" ")
                first_name = parts[0] if len(parts) > 0 else ""
                last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
                
                payload = {
                    "customer": {
                        "id": record_id,
                        "first_name": first_name,
                        "last_name": last_name,
                        "email": record_data.get("email"),
                        "phone": record_data.get("phone")
                    }
                }
                res = self.request_with_retry("PUT", url, headers=headers, json=payload)
                return {"success": True, "message": "Customer updated on Shopify.", "data": res.json()}
                
            elif object_name == "products":
                product_url = f"https://{shop_url}/admin/api/2024-01/products/{record_id}.json"
                p_res = self.request_with_retry("GET", product_url, headers=headers)
                product_data = p_res.json().get("product", {})
                variants = product_data.get("variants", [])
                
                if not variants:
                    raise ValueError("No variants found for the selected Shopify product.")
                    
                variant_id = variants[0]["id"]
                variant_url = f"https://{shop_url}/admin/api/2024-01/variants/{variant_id}.json"
                
                payload = {
                    "variant": {
                        "id": variant_id,
                        "price": str(record_data.get("price", variants[0]["price"])),
                        "sku": record_data.get("sku", variants[0].get("sku")),
                        "inventory_quantity": int(record_data.get("inventory_quantity", variants[0].get("inventory_quantity", 0)))
                    }
                }
                res = self.request_with_retry("PUT", variant_url, headers=headers, json=payload)
                return {"success": True, "message": "Product variant updated on Shopify.", "data": res.json()}
                
            elif object_name == "orders":
                url = f"https://{shop_url}/admin/api/2024-01/orders/{record_id}.json"
                payload = {
                    "order": {
                        "id": record_id,
                        "note": record_data.get("custom_shipping_instructions", "")
                    }
                }
                res = self.request_with_retry("PUT", url, headers=headers, json=payload)
                return {"success": True, "message": "Order notes updated on Shopify.", "data": res.json()}
                
            return {"success": False, "message": f"Unsupported object type: {object_name}"}
