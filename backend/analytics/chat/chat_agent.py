import os
import re
import json
import duckdb
from typing import List, Dict, Any, Tuple
from analytics.utils.llm_client import generate_content_safe

_SQL_RULES = """\
Rules:
- Output ONLY raw SQL. No markdown.
- FROM must use: data_table
- Double-quote column names with spaces: "Col Name". Never single-quote columns.
- LIMIT: "top 5"->LIMIT 5, "highest"->LIMIT 1, else LIMIT 20.
- For month/year filters use EXTRACT(). March=3, June=6.
- Use LOWER(col) LIKE LOWER('%word%') for name matching.
- Use the exact column names and values from the schema above. Never guess column names.
- If the question asks about a name/person, filter using the relevant column with LIKE.
- If the question asks about a category value (e.g. "udhaar", "sale"), filter WHERE that column = 'value'.
- For total/amount/sum questions, use SUM(column).
- For yes/no questions, use COUNT(*).
- For names/list questions, SELECT the name column."""

_GENERAL_CHAT_PROMPT = "You are an AI Business Analytics Assistant. Answer concisely: '{question}'"
_GENERAL_CHAT_DEFAULT = "Hello! Ask me any questions about your dataset."
_HINGLISH_ANALYSIS_WORDS = {"sum", "average", "total", "count", "amount", "sales", "revenue", "kitna", "kitne", "hai", "kya", "bata", "naam", "udhar", "pese", "paise", "kaun", "kis", "kinse", "sale", "lena", "dena"}


def detect_chat_intent(question: str) -> str:
    q = question.lower().strip()
    greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "thanks", "thank you", "bye", "goodbye", "help"]
    if any(q == g or q.startswith(g + " ") for g in greetings):
        return "general_chat"
    if any(k in q for k in _HINGLISH_ANALYSIS_WORDS):
        return "data_query"
    return "data_query"


def _find_name_in_context(chat_context: str) -> str:
    for line in reversed(chat_context.strip().split("\n")):
        if line.startswith("Assistant:"):
            for prefix in ["ka total", "ka amount", "ke total"]:
                if prefix in line:
                    name = line.split(prefix)[0].replace("Assistant:", "").strip()
                    if name:
                        return name
    return ""


def generate_duckdb_sql(question: str, schema_desc: str, chat_context: str, client) -> str:
    enriched_q = question
    if chat_context:
        name = _find_name_in_context(chat_context)
        if name and any(w in question.lower() for w in ["how much", "kitna", "amount", "unke", "inka", "iska"]):
            enriched_q = f"{question} (about {name})"
    context_block = f"History:\n{chat_context}\n" if chat_context else ""
    prompt = f"""\
{schema_desc}

{context_block}Q: {enriched_q}

{_SQL_RULES}

SQL:
"""
    try:
        sql = generate_content_safe(
            client, prompt,
            model=os.environ.get("LLM_SQL_MODEL", "llama-3.3-70b-versatile"),
            max_tokens=int(os.environ.get("LLM_SQL_MAX_TOKENS", "500")),
            endpoint="sql_gen",
        )
        sql = sql.replace("```sql", "").replace("```", "").strip()
        sql = re.sub(r'`([^`]+)`', r'"\1"', sql)
        sql = re.sub(r'LIKE\s+"([^"]+)"', lambda m: "LIKE '" + m.group(1) + "'", sql, flags=re.IGNORECASE)
        sql = re.sub(
            r'(LOWER\s*\(\s*"[^"]+"\s*\))\s*=\s*LOWER\s*\(\s*\'([^\']+)\'\s*\)',
            r"\1 LIKE LOWER('%\2%')",
            sql, flags=re.IGNORECASE,
        )
        return sql
    except Exception as e:
        print(f"[Chat SQL Gen] Failed: {e}", flush=True)
        return ""


def execute_duckdb_query(query: str, parquet_path: str) -> Tuple[List[Dict[str, Any]], str]:
    if not os.path.exists(parquet_path):
        return [], "Dataset file not found on disk."
    duck_sql = re.sub(r'\bdata_table\b', f"read_parquet('{parquet_path.replace(chr(39), chr(92)+chr(39))}')", query, flags=re.IGNORECASE)
    clean = duck_sql.upper()
    if any(k in clean for k in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE"]):
        raise PermissionError("Dangerous keywords detected in generated SQL.")
    try:
        con = duckdb.connect(database=':memory:', read_only=False)
        result_df = con.execute(duck_sql).pl()
        return result_df.to_dicts(), duck_sql
    except Exception as e:
        print(f"[Chat SQL Exec] Failed: {e}", flush=True)
        raise


def _format_amount_response(question: str, amount: float) -> str:
    q = question.lower().strip()
    yes_no_words = {"hai kya", "hui hai kya", "hui hu", "hai ki nhi", "hai ya nhi"}
    if any(w in q for w in yes_no_words) and amount == int(amount):
        count = int(amount)
        return f"Yes, {count} records found." if count > 0 else "No matching records found."
    for prefix in ["ka amount bata", "ka amount", "ke kitne hai", "ka total", "se kitne lene hai", "ki amount", "ka total amount"]:
        idx = q.find(prefix)
        if idx > 0:
            name = q[:idx].strip().title()
            return f"{name}: {amount}"
    return f"Total: {amount}"


_EXPLANATION_PROMPT = """Given the question and data, answer in 1-2 sentences using exact numbers from the data.

Q: {question}
Data: {data}

Answer:"""


def explain_sql_results(question: str, results: List[Dict[str, Any]], client) -> str:
    if len(results) == 1:
        vals = [v for v in results[0].values() if v is not None]
        if len(vals) == 1 and isinstance(vals[0], (int, float)):
            return _format_amount_response(question, vals[0])
    keys = list(results[0].keys()) if results else []
    if len(keys) <= 2 and all(isinstance(v, (int, float)) for r in results for v in r.values() if v is not None):
        total = sum(v for r in results for v in r.values() if isinstance(v, (int, float)))
        return _format_amount_response(question, total)
    wants_list = any(w in question.lower() for w in ["naam", "name", "list", "kaun", "kis", "kinse", "bata"])
    if wants_list and len(results) <= 50:
        return "\n".join(
            f"{i}. {' — '.join(str(v) for v in r.values() if v is not None)}"
            for i, r in enumerate(results, 1)
        )
    try:
        prompt = _EXPLANATION_PROMPT.format(question=question, data=json.dumps(results[:30], indent=2))
        return generate_content_safe(client, prompt, max_tokens=int(os.environ.get("LLM_EXPLAIN_MAX_TOKENS", "300")), endpoint="explain").strip()
    except Exception:
        return json.dumps(results[:5])


def execute_chat_query(
    question: str,
    parquet_path: str,
    schema_desc: str,
    client,
    chat_context: str = "",
) -> Dict[str, Any]:
    intent = detect_chat_intent(question)
    if intent == "general_chat" or not client:
        try:
            prompt = _GENERAL_CHAT_PROMPT.format(question=question)
            resp = generate_content_safe(client, prompt, max_tokens=100, endpoint="general_chat")
        except Exception:
            resp = _GENERAL_CHAT_DEFAULT
        return {"response": resp, "sqlQuery": None, "sqlResults": None, "chatUsedSql": False}

    sql_query = generate_duckdb_sql(question, schema_desc, chat_context, client)
    if not sql_query:
        return {"response": "Could not generate a query. Please rephrase.", "sqlQuery": None, "sqlResults": None, "chatUsedSql": False}

    try:
        results, executed_sql = execute_duckdb_query(sql_query, parquet_path)
        if len(results) == 0:
            explanation = "No matching records found."
        else:
            explanation = explain_sql_results(question, results, client)
        return {"response": explanation, "sqlQuery": executed_sql, "sqlResults": results[:100], "chatUsedSql": True}
    except Exception as e:
        return {"response": f"SQL: `{sql_query}` — error: {str(e)}", "sqlQuery": sql_query, "sqlResults": None, "chatUsedSql": True}
