import time
import httpx
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

logger = logging.getLogger("EnterpriseConnectorSDK")

class BaseConnector(ABC):
    """
    Production-grade Base Connector SDK that handles auth, retries,
    rate-limiting, pagination, watermark tracking, and metadata discovery.
    """
    def __init__(self, config: dict):
        # Decrypt sensitive credentials securely using standard Base SDK decryptor
        from connectors.oauth import decrypt_token
        self.config = {}
        for k, v in (config or {}).items():
            if k in ["accessToken", "refreshToken", "apiKey", "database", "password"] and isinstance(v, str):
                self.config[k] = decrypt_token(v)
            else:
                self.config[k] = v
                
        self.watermark: Optional[str] = self.config.get("watermark")
        self.client = None # Optional genai Client injected for custom field classification

    @abstractmethod
    def authenticate(self) -> dict:
        """
        Validates connection credentials, refreshes tokens if necessary, and returns session info.
        """
        pass

    @abstractmethod
    def fetchModulesOrObjects(self) -> List[str]:
        """
        Queries platform API metadata to list all active schemas, modules, or tables at runtime.
        """
        pass

    @abstractmethod
    def fetchFields(self, object_name: str) -> dict:
        """
        Queries platform API schema metadata for fields.
        Returns: {"standard": list_of_fields, "custom": list_of_fields}
        """
        pass

    @abstractmethod
    def fetchData(self, object_name: str, fields: List[str], limit: int = 500) -> list:
        """
        Fetches row records for the specified object and fields.
        """
        pass

    def writeBack(self, object_name: str, record_data: dict) -> dict:
        """
        Optional bidirectional write-back capability.
        """
        raise NotImplementedError("Write-back capability not supported by this connector.")

    def registerWebhook(self, event_type: str, callback_url: str) -> dict:
        """
        Optional Webhook push registration.
        """
        raise NotImplementedError("Webhook notifications not supported by this connector.")

    # ─── Resilience & Utility Methods ───

    def request_with_retry(self, method: str, url: str, retries: int = 3, **kwargs) -> httpx.Response:
        """
        Executes HTTP requests with automated Rate Limiting (429) backoff,
        exponential retries, and detailed logging.
        """
        backoff = 1.5
        for attempt in range(retries + 1):
            try:
                # Dynamic OAuth Token Refresh Check
                self.check_and_refresh_token()
                
                with httpx.Client(timeout=10.0) as http_client:
                    response = http_client.request(method, url, **kwargs)
                    
                    # Handle Rate Limiting
                    if response.status_code == 429:
                        retry_after = int(response.headers.get("Retry-After", 2))
                        logger.warning(f"[Rate Limit 429] Pacing request. Retrying in {retry_after}s...")
                        time.sleep(retry_after)
                        continue
                    
                    response.raise_for_status()
                    return response
            except Exception as e:
                # If it's a client status error (except 429 which we handled above), do not retry!
                if isinstance(e, httpx.HTTPStatusError):
                    status_code = e.response.status_code
                    if 400 <= status_code < 500:
                        raise e
                if attempt == retries:
                    raise e
                time.sleep(backoff ** attempt)
        raise Exception("Max retries exceeded")

    def check_and_refresh_token(self) -> None:
        """
        Utility to dynamically check OAuth token expiration and invoke token refresh.
        """
        expires_at = self.config.get("expiresAt")
        refresh_token = self.config.get("refreshToken")
        
        if expires_at and refresh_token:
            # Check if token is expired or close to expiration (within 2 minutes)
            exp_time = datetime.fromisoformat(expires_at)
            if (exp_time - datetime.utcnow()).total_seconds() < 120:
                logger.info("[OAuth SDK] Access token expired or expiring soon. Refreshing...")
                self._execute_token_refresh()

    def _execute_token_refresh(self) -> None:
        """Executes OAuth token exchange."""
        refresh_token = self.config.get("refreshToken")
        client_id = self.config.get("clientId")
        client_secret = self.config.get("clientSecret")
        refresh_url = self.config.get("tokenRefreshUrl")
        
        if not refresh_url:
            return
            
        try:
            res = httpx.post(refresh_url, data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret
            })
            if res.status_code == 200:
                data = res.json()
                self.config["accessToken"] = data.get("access_token")
                # Update expiration time (default to 1 hour)
                exp_in = data.get("expires_in", 3600)
                self.config["expiresAt"] = (datetime.utcnow() + timedelta(seconds=exp_in)).isoformat()
                logger.info("[OAuth SDK] Token refreshed successfully.")
        except Exception as e:
            logger.error(f"[OAuth SDK] Failed to refresh token: {str(e)}")

    def paginate(self, url: str, headers: dict, next_page_key: str = "next_page", limit: int = 500) -> list:
        """
        Generic pagination handler that fetches all rows iteratively.
        """
        results = []
        current_url = url
        
        while current_url and len(results) < limit:
            response = self.request_with_retry("GET", current_url, headers=headers)
            data = response.json()
            
            # Extract records list
            records = data.get("data") or data.get("results") or data.get("records")
            if not isinstance(records, list):
                # Fallback to direct json if it's a direct array response
                if isinstance(data, list):
                    records = data
                else:
                    break
                    
            results.extend(records)
            
            # Check for next page link
            current_url = data.get(next_page_key) or data.get("links", {}).get("next")
            
        return results[:limit]

    # ─── Dynamic Schema Ingestion ───

    def discover_metadata(self) -> dict:
        """
        Performs dynamic metadata discovery at runtime.
        Retrieves all active objects/modules and details their standard + custom fields.
        """
        metadata = {}
        supported_objects = self.fetchModulesOrObjects()
        for obj in supported_objects:
            fields = self.fetchFields(obj)
            metadata[obj] = {
                "standard": fields.get("standard", []),
                "custom": fields.get("custom", [])
            }
        return metadata

    def classify_custom_fields(self, custom_fields: List[str]) -> dict:
        """
        Optional AI classification of custom fields into canonical business category codes.
        AI ONLY does taxonomy taxonomy mapping, never identifies raw data columns directly.
        """
        if not self.client or not custom_fields:
            return {f: "text" for f in custom_fields}
            
        # Call LLM client to map custom fields to canonical categories
        prompt = f"""
You are a senior database schema architect. Classify the following custom spreadsheet/integration database fields into one of these canonical categories:
- currency (financial values, rates, totals, decimals)
- date (timestamps, calendars, registers)
- measure (counts, quantities, integer values)
- category (labels, options, stages, status strings)
- text (descriptions, general memos, comments)
- identifier (ids, codes, reference keys)

CUSTOM FIELDS TO CLASSIFY:
{custom_fields}

Return ONLY a JSON dictionary where keys are the input custom fields and values are the classified lowercase category codes. Do not wrap in markdown or add explanations.
"""
        try:
            from analytics.utils.llm_client import generate_content_safe
            res_text = generate_content_safe(self.client, prompt, json_mode=True)
            import json
            return json.loads(res_text)
        except Exception as e:
            logger.error(f"[AI Classification SDK] Custom fields classification failed: {e}")
            return {f: "text" for f in custom_fields}

    def sync_data(self) -> dict:
        """
        Enterprise Sync Engine: Orchestrates authentication, discovers runtime metadata,
        extracts data for standard and custom fields, and translates into canonical business format.
        """
        # 1. Authenticate
        self.authenticate()
        
        # 2. Discover active metadata
        metadata = self.discover_metadata()
        synced_data = {}
        
        # 3. Synchronize data for each discovered entity
        for obj_name, fields_info in metadata.items():
            all_fields = fields_info["standard"] + fields_info["custom"]
            
            # Fetch data with paginated retries
            raw_records = self.fetchData(obj_name, all_fields)
            
            # Map schema to common canonical schema
            canonical_records = self.schema_mapping(obj_name, raw_records)
            synced_data[obj_name] = canonical_records
            
        return {
            "success": True,
            "entities": synced_data,
            "metadata": metadata
        }

    def sync(self) -> dict:
        """Backward compatibility wrapper for sync_data."""
        return self.sync_data()
