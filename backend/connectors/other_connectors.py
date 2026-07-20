from datetime import datetime, timedelta
from connectors.sdk import BaseConnector

class WooCommerceConnector(BaseConnector):
    def authenticate(self) -> dict:
        return {"authenticated": True}

    def test_connection(self) -> dict:
        return {"success": True, "message": "WooCommerce connection verified."}

    def fetchModulesOrObjects(self) -> list:
        return ["customers", "orders", "products"]

    def fetchFields(self, object_name: str) -> dict:
        if object_name == "customers":
            return {"standard": ["id", "first_name", "last_name", "email"], "custom": ["custom_loyalty_id"]}
        elif object_name == "orders":
            return {"standard": ["id", "customer_id", "total", "status", "created_at"], "custom": []}
        elif object_name == "products":
            return {"standard": ["id", "title", "price"], "custom": []}
        return {"standard": [], "custom": []}

    def fetchData(self, object_name: str, fields: list, limit: int = 500) -> list:
        now = datetime.utcnow()
        if object_name == "customers":
            return [{"id": "wc_1", "first_name": "Aanya", "last_name": "Iyer", "email": "aanya@wc.com", "custom_loyalty_id": "LOY-WC-1"}]
        elif object_name == "orders":
            return [{"id": "wc_o1", "customer_id": "wc_1", "total": "399.00", "status": "completed", "created_at": now.isoformat()}]
        elif object_name == "products":
            return [{"id": "wc_p1", "title": "Cotton Bedspread", "price": "399.00"}]
        return []

    def schema_mapping(self, entity_name: str, raw_data: list) -> list:
        mapped = []
        for r in raw_data:
            if entity_name == "customers":
                mapped.append({
                    "id": str(r["id"]),
                    "name": f"{r.get('first_name', '')} {r.get('last_name', '')}".strip(),
                    "email": r.get("email"),
                    "custom_loyalty_id": r.get("custom_loyalty_id")
                })
            elif entity_name == "orders":
                mapped.append({
                    "id": str(r["id"]),
                    "customer_id": str(r["customer_id"]),
                    "total_amount": float(r["total"]),
                    "status": r["status"],
                    "created_at": r["created_at"]
                })
            elif entity_name == "products":
                mapped.append({
                    "id": str(r["id"]),
                    "title": r["title"],
                    "price": float(r["price"])
                })
        return mapped


class ZohoBooksConnector(BaseConnector):
    def authenticate(self) -> dict:
        return {"authenticated": True}

    def test_connection(self) -> dict:
        return {"success": True, "message": "Zoho Books OAuth connection validated."}

    def fetchModulesOrObjects(self) -> list:
        return ["customers", "invoices", "expenses"]

    def fetchFields(self, object_name: str) -> dict:
        if object_name == "customers":
            return {"standard": ["customer_id", "customer_name", "email"], "custom": ["custom_tax_no"]}
        elif object_name == "invoices":
            return {"standard": ["invoice_id", "customer_id", "date", "total", "balance", "status"], "custom": []}
        elif object_name == "expenses":
            return {"standard": ["date", "amount", "category", "description"], "custom": []}
        return {"standard": [], "custom": []}

    def fetchData(self, object_name: str, fields: list, limit: int = 500) -> list:
        now = datetime.utcnow()
        if object_name == "customers":
            return [{"customer_id": "zh_c1", "customer_name": "Venkatesh Murthy", "email": "venkat@zoho.com", "custom_tax_no": "TAX-ZH-99"}]
        elif object_name == "invoices":
            return [{"invoice_id": "zh_inv1", "customer_id": "zh_c1", "date": now.isoformat(), "total": 12500.0, "balance": 4500.0, "status": "sent"}]
        elif object_name == "expenses":
            return [{"date": now.isoformat(), "amount": 8000.0, "category": "Advertising", "description": "Zoho Ads campaign billing"}]
        return []

    def schema_mapping(self, entity_name: str, raw_data: list) -> list:
        mapped = []
        for r in raw_data:
            if entity_name == "customers":
                mapped.append({
                    "id": str(r["customer_id"]),
                    "name": r["customer_name"],
                    "email": r["email"],
                    "custom_tax_no": r.get("custom_tax_no")
                })
            elif entity_name == "invoices":
                mapped.append({
                    "id": str(r["invoice_id"]),
                    "customer_id": str(r["customer_id"]),
                    "issue_date": r["date"],
                    "total_amount": float(r["total"]),
                    "balance_due": float(r["balance"]),
                    "status": r["status"]
                })
            elif entity_name == "expenses":
                mapped.append({
                    "date": r["date"],
                    "amount": float(r["amount"]),
                    "category": r["category"],
                    "description": r.get("description")
                })
        return mapped


class RazorpayConnector(BaseConnector):
    def authenticate(self) -> dict:
        return {"authenticated": True}

    def test_connection(self) -> dict:
        return {"success": True, "message": "Razorpay connection successful."}

    def fetchModulesOrObjects(self) -> list:
        return ["customers", "payments"]

    def fetchFields(self, object_name: str) -> dict:
        if object_name == "customers":
            return {"standard": ["id", "name", "email", "contact"], "custom": []}
        elif object_name == "payments":
            return {"standard": ["id", "amount", "method", "status", "created_at"], "custom": ["custom_gst_exempt"]}
        return {"standard": [], "custom": []}

    def fetchData(self, object_name: str, fields: list, limit: int = 500) -> list:
        now = datetime.utcnow()
        if object_name == "customers":
            return [{"id": "rp_cust1", "name": "Kunal Bahl", "email": "kunal@rp.com", "contact": "+919999911111"}]
        elif object_name == "payments":
            return [{"id": "pay_rp1", "amount": 150000, "method": "upi", "status": "captured", "created_at": int(now.timestamp()), "custom_gst_exempt": False}]
        return []

    def schema_mapping(self, entity_name: str, raw_data: list) -> list:
        mapped = []
        for r in raw_data:
            if entity_name == "customers":
                mapped.append({
                    "id": r["id"],
                    "name": r["name"],
                    "email": r["email"],
                    "phone": r.get("contact")
                })
            elif entity_name == "payments":
                mapped.append({
                    "id": r["id"],
                    "amount": float(r["amount"]) / 100.0,
                    "payment_method": r["method"],
                    "status": r["status"],
                    "created_at": datetime.utcfromtimestamp(r["created_at"]).isoformat(),
                    "custom_gst_exempt": r.get("custom_gst_exempt")
                })
        return mapped


class AdAdsConnector(BaseConnector):
    def __init__(self, config: dict, channel: str):
        super().__init__(config)
        self.channel = channel

    def authenticate(self) -> dict:
        return {"authenticated": True}

    def test_connection(self) -> dict:
        return {"success": True, "message": f"{self.channel} API verified."}

    def fetchModulesOrObjects(self) -> list:
        return ["revenue", "expenses"]

    def fetchFields(self, object_name: str) -> dict:
        if object_name == "revenue":
            return {"standard": ["date", "conversions_value"], "custom": []}
        elif object_name == "expenses":
            return {"standard": ["date", "spend"], "custom": ["custom_campaign_agent_fee"]}
        return {"standard": [], "custom": []}

    def fetchData(self, object_name: str, fields: list, limit: int = 500) -> list:
        now = datetime.utcnow()
        if object_name == "revenue":
            return [{"date": now.isoformat(), "conversions_value": 45000.0}]
        elif object_name == "expenses":
            return [{"date": now.isoformat(), "spend": 15000.0, "custom_campaign_agent_fee": 150.0}]
        return []

    def schema_mapping(self, entity_name: str, raw_data: list) -> list:
        mapped = []
        for r in raw_data:
            if entity_name == "revenue":
                mapped.append({
                    "date": r["date"],
                    "amount": float(r["conversions_value"]),
                    "source_channel": self.channel
                })
            elif entity_name == "expenses":
                mapped.append({
                    "date": r["date"],
                    "amount": float(r["spend"]),
                    "category": "Marketing Ads",
                    "description": f"{self.channel} campaign spend",
                    "custom_campaign_agent_fee": r.get("custom_campaign_agent_fee")
                })
        return mapped


class GA4Connector(BaseConnector):
    def authenticate(self) -> dict:
        return {"authenticated": True}

    def test_connection(self) -> dict:
        return {"success": True, "message": "GA4 API validated."}

    def fetchModulesOrObjects(self) -> list:
        return ["revenue"]

    def fetchFields(self, object_name: str) -> dict:
        return {"standard": ["date", "purchase_revenue"], "custom": []}

    def fetchData(self, object_name: str, fields: list, limit: int = 500) -> list:
        now = datetime.utcnow()
        if object_name == "revenue":
            return [{"date": now.isoformat(), "purchase_revenue": 3499.0}]
        return []

    def schema_mapping(self, entity_name: str, raw_data: list) -> list:
        mapped = []
        for r in raw_data:
            if entity_name == "revenue":
                mapped.append({
                    "date": r["date"],
                    "amount": float(r["purchase_revenue"]),
                    "source_channel": "Google Analytics 4"
                })
        return mapped
