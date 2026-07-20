import os
import httpx
import json
from google import genai
from google.genai import types

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)

SCRAPER_PROMPT = """
You are a web scraping data extraction assistant.
You will receive the HTML source code of a web page.
Analyze the HTML and extract the main tabular data or list of items (such as product lists, directory items, pricing logs, invoices, transactions, or tabular reports) present in the page.

Return ONLY a JSON response matching this schema:
{
  "headers": ["col1", "col2", ...],
  "rows": [
    {"col1": "val1", "col2": "val2", ...},
    ...
  ]
}

Ensure the extracted data:
1. Maps to clean, consistent English column keys.
2. Contains only valid data records, filtering out navigation bars, footers, and page layouts.
3. If no list or tabular data is found, return empty lists for headers and rows.
"""

def scrape_web_page(url: str) -> dict:
    """
    Fetches the web page content and uses Gemini to scrape and structure it.
    """
    try:
        # Fetch the web page HTML
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        with httpx.Client(timeout=20.0, follow_redirects=True) as http_client:
            res = http_client.get(url, headers=headers)
            res.raise_for_status()
            html_content = res.text
            
        # Clean HTML slightly to save token context window (remove script, style tags)
        import re
        html_content = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', html_content)
        html_content = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', html_content)
        
        # Limit html size to avoid token issues (say, first 150KB)
        html_content = html_content[:150000]
        
        if not client:
            raise ValueError("Gemini API key is not configured in backend.")
            
        # Call Gemini to extract structured tables
        prompt = f"{SCRAPER_PROMPT}\n\nTARGET WEB PAGE HTML:\n{html_content}\n\nJSON Output:"
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json"}
        )
        
        parsed = json.loads(response.text.strip())
        return {
            "success": True,
            "headers": parsed.get("headers", []),
            "rows": parsed.get("rows", []),
            "rowCount": len(parsed.get("rows", []))
        }
    except Exception as e:
        print(f"[Web Scraper Service] Error: {e}")
        return {
            "success": False,
            "error": str(e),
            "headers": [],
            "rows": [],
            "rowCount": 0
        }
