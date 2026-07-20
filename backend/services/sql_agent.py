import os
import re
import json
from google import genai
from sqlalchemy.orm import Session
from sqlalchemy import text

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)

DB_SCHEMA_PROMPT = """
You are a PostgreSQL SQL Expert. Your task is to generate a secure, read-only SQL query to answer the user's question.
Return ONLY raw SQL query inside a markdown code block starting with ```sql and ending with ```. Do not write any other explanation or text.

DATABASE TABLES AND COLUMNS:
1. "users":
   - "id": varchar (Primary Key)
   - "email": varchar
   - "first_name": varchar
   - "last_name": varchar

2. "business_profiles":
   - "id": varchar (Primary Key)
   - "name": varchar (business name)
   - "industry": varchar
   - "owner_id": varchar (references users.id)

3. "business_members":
   - "id": varchar (Primary Key)
   - "business_id": varchar (references business_profiles.id)
   - "user_id": varchar (references users.id)
   - "email": varchar
   - "name": varchar
   - "member_role": varchar ('owner', 'manager', 'employee')
   - "status": varchar ('active', 'pending', 'inactive')

4. "business_verticals":
   - "id": varchar (Primary Key)
   - "business_id": varchar
   - "name": varchar (vertical division e.g., 'Sales & CRM', 'Operations', 'Bedroom')
   - "metric_label": varchar (e.g. 'Revenue', 'Units')

5. "eod_entries":
   - "id": varchar (Primary Key)
   - "business_id": varchar
   - "member_id": varchar (references business_members.id)
   - "vertical_id": varchar (references business_verticals.id)
   - "entry_date": date (YYYY-MM-DD)
   - "revenue_amount": integer (in cents, divide by 100 for rupees/dollars)
   - "units_sold": integer
   - "deals_closed": integer
   - "notes": text

6. "salary_configs":
   - "id": varchar (Primary Key)
   - "business_id": varchar
   - "member_id": varchar
   - "base_salary": integer
   - "travel_allowance_cap": integer

7. "employee_targets":
   - "id": varchar (Primary Key)
   - "business_id": varchar
   - "member_id": varchar
   - "period_label": varchar (e.g., '2026-06')
   - "target_value": integer

8. "business_tasks":
   - "id": varchar (Primary Key)
   - "business_id": varchar
   - "title": varchar
   - "description": text
   - "status": varchar ('todo', 'in_progress', 'completed')
   - "priority": varchar ('low', 'medium', 'high')
   - "due_date": date

9. "visit_logs":
   - "id": varchar (Primary Key)
   - "business_id": varchar
   - "member_id": varchar
   - "action_type": varchar ('punch_in', 'punch_out', 'check_in', 'check_out')
   - "timestamp": timestamp

RULES:
- ONLY output a SELECT query.
- Use explicit JOINs when matching user name, vertical name, or business profile.
- Filter by business_id = '$BUSINESS_ID' to prevent cross-tenant queries.
- Limit query results to at most 100 rows.
- Use PostgreSQL-compatible syntax.
"""

def is_query_safe(sql: str) -> bool:
    """
    Validates that the query is read-only and contains no mutating SQL keywords.
    """
    clean_sql = sql.strip().upper()
    if not clean_sql.startswith("SELECT"):
        return False
    
    dangerous_keywords = [
        r"\bINSERT\b", r"\bUPDATE\b", r"\bDELETE\b", r"\bDROP\b", 
        r"\bALTER\b", r"\bCREATE\b", r"\bTRUNCATE\b", r"\bREPLACE\b", 
        r"\bGRANT\b", r"\bREVOKE\b", r"\bMERGE\b", r"\bUPSERT\b"
    ]
    
    for kw in dangerous_keywords:
        if re.search(kw, clean_sql, re.IGNORECASE):
            return False
            
    return True

def generate_sql_query(question: str, business_id: str) -> str:
    """
    Asks Gemini to write a SQL query answering the question.
    """
    if not client:
        return ""
        
    prompt = f"{DB_SCHEMA_PROMPT}\n\nBUSINESS ID Context: {business_id}\n\nUSER QUESTION: \"{question}\"\n\nGenerate SQL query:"
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        output = response.text or ""
        
        # Extract markdown SQL block if present
        sql_match = re.search(r"```sql([\s\S]*?)```", output) or re.search(r"```([\s\S]*?)```", output)
        sql_query = sql_match.group(1).strip() if sql_match else output.strip()
        
        # Replace template parameter with actual business id
        sql_query = sql_query.replace("$BUSINESS_ID", business_id)
        
        return sql_query
    except Exception as e:
        print(f"[SQL Agent] Error generating SQL: {e}")
        return ""

def execute_safe_query(db: Session, sql_query: str) -> list[dict]:
    """
    Runs a validated SQL query against the database and returns structured dictionaries.
    """
    if not is_query_safe(sql_query):
        raise ValueError("Security Violation: Non-SELECT or mutating query detected.")
        
    try:
        result = db.execute(text(sql_query))
        rows = result.fetchall()
        keys = result.keys()
        
        # Convert row values to dictionaries, serializing dates
        results = []
        for r in rows:
            row_dict = {}
            for k, val in zip(keys, r):
                if hasattr(val, "isoformat"):
                    row_dict[k] = val.isoformat()
                else:
                    row_dict[k] = val
            results.append(row_dict)
        return results
    except Exception as e:
        print(f"[SQL Agent] Query execution error: {e}")
        raise e

def explain_results(question: str, sql_query: str, results: list[dict]) -> str:
    """
    Asks Gemini to explain the JSON rows in business terms.
    """
    if not client:
        return "Gemini API client not configured. Query executed but cannot synthesize explanation."

    explanation_prompt = f"""
You are a helpful AI Business Advisor. Explain the database query results to the user in a natural, clear manner.
Do not mention SQL, databases, or table names. Focus on the business answer.

USER QUESTION: "{question}"
SQL EXECUTED: "{sql_query}"
QUERY RESULTS (JSON):
{json.dumps(results, indent=2)}

Provide a concise, direct explanation with key numbers highlighted.
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=explanation_prompt
        )
        return response.text or "No explanation generated."
    except Exception as e:
        print(f"[SQL Agent] Explanation generation error: {e}")
        return f"Query run successfully, returned {len(results)} rows."
