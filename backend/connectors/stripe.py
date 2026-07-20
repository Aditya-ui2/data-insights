import httpx
from datetime import datetime, timedelta
from connectors.sdk import BaseConnector

class StripeConnector(BaseConnector):
    """
    Stripe Enterprise Connector implementing BaseConnector lifecycle.
    """
    def authenticate(self) -> dict:
        api_key = self.config.get("apiKey") or self.config.get("host") or self.config.get("database") or self.config.get("password")
        if not api_key:
            raise ValueError("Missing Stripe Secret API Key.")
        return {"authenticated": True}

    def test_connection(self) -> dict:
        try:
            self.authenticate()
            api_key = self.config.get("apiKey") or self.config.get("host") or self.config.get("database") or self.config.get("password")
            if not api_key or "mock" in api_key:
                return {"success": True, "message": "Sandbox Stripe connection validated."}
                
            # Real endpoint check using retry mechanism
            url = "https://api.stripe.com/v1/balance"
            headers = {"Authorization": f"Bearer {api_key}"}
            self.request_with_retry("GET", url, headers=headers)
            return {"success": True, "message": "Connected to Stripe successfully."}
        except Exception as e:
            return {"success": False, "message": f"Stripe connection failed: {str(e)}"}

    def fetchModulesOrObjects(self) -> list:
        return ["customers", "payments"]

    def fetchFields(self, object_name: str) -> dict:
        if object_name == "customers":
            return {
                "standard": ["id", "name", "email", "phone", "created"],
                "custom": ["custom_tax_id", "custom_vat_registered"]
            }
        elif object_name == "payments":
            return {
                "standard": ["id", "amount", "paid", "created", "payment_method_details"],
                "custom": ["custom_accounting_code"]
            }
        return {"standard": [], "custom": []}

    def fetchData(self, object_name: str, fields: list, limit: int = 500) -> list:
        api_key = self.config.get("apiKey") or self.config.get("host") or self.config.get("database") or self.config.get("password")
        is_sandbox = not api_key or "mock" in api_key

        if is_sandbox:
            raw_rows = self._get_sandbox_data(object_name)
            for r in raw_rows:
                if object_name == "customers":
                    r["custom_tax_id"] = "TX-IND-999"
                    r["custom_vat_registered"] = True
                elif object_name == "payments":
                    r["custom_accounting_code"] = "REV-AC-100"
            return raw_rows[:limit]
            
        # Real Stripe API request
        stripe_obj = "customers" if object_name == "customers" else "charges"
        url = f"https://api.stripe.com/v1/{stripe_obj}?limit={min(limit, 100)}"
        headers = {"Authorization": f"Bearer {api_key}"}
        
        res = self.request_with_retry("GET", url, headers=headers)
        res_data = res.json()
        return res_data.get("data", [])

    def schema_mapping(self, entity_name: str, raw_data: list) -> list:
        mapped = []
        for item in raw_data:
            if entity_name == "customers":
                mapped.append({
                    "id": item.get("id"),
                    "name": item.get("name") or item.get("email") or "Stripe Customer",
                    "email": item.get("email"),
                    "phone": item.get("phone"),
                    "created_at": datetime.utcfromtimestamp(item.get("created", 1782537207)).isoformat(),
                    "custom_tax_id": item.get("custom_tax_id"),
                    "custom_vat_registered": item.get("custom_vat_registered")
                })
            elif entity_name == "payments":
                mapped.append({
                    "id": item.get("id"),
                    "amount": float(item.get("amount", 0.0)) / 100.0,
                    "payment_method": item.get("payment_method_details", {}).get("type", "card") if item.get("payment_method_details") else "card",
                    "status": "succeeded" if item.get("paid") else "failed",
                    "created_at": datetime.utcfromtimestamp(item.get("created", 1782537207)).isoformat(),
                    "custom_accounting_code": item.get("custom_accounting_code")
                })
        return mapped

    def _get_sandbox_data(self, entity_name: str) -> list:
        now = int(datetime.utcnow().timestamp())
        if entity_name == "customers":
            return [
                {"id": "cus_1001", "name": "Aditya Rathore", "email": "aditya@example.com", "phone": "9999999999", "created": now - 86400 * 30},
                {"id": "cus_1002", "name": "Rohan Gupta", "email": "rohan@example.com", "phone": "8888888888", "created": now - 86400 * 15}
            ]
        elif entity_name == "payments":
            return [
                {"id": "ch_5001", "amount": 250000, "paid": True, "created": now - 86400 * 10, "payment_method_details": {"type": "card"}},
                {"id": "ch_5002", "amount": 490000, "paid": True, "created": now - 86400 * 5, "payment_method_details": {"type": "upi"}}
            ]
        return []
