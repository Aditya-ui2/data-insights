import { db } from "../db";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Describe database schema for SQL Agent
const DB_SCHEMA_PROMPT = `
You are a PostgreSQL SQL Expert. Your task is to generate a secure, read-only SQL query to answer the user's question.
Return ONLY raw SQL query inside a markdown code block starting with \`\`\`sql and ending with \`\`\`. Do not write any other explanation or text.

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
`;

/**
 * Validates that the generated SQL is read-only and safe.
 */
export function isQuerySafe(sql: string): boolean {
  const cleanSql = sql.trim().toUpperCase();
  if (!cleanSql.startsWith("SELECT")) {
    return false;
  }
  const dangerousKeywords = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", 
    "TRUNCATE", "REPLACE", "GRANT", "REVOKE", "MERGE", "UPSERT"
  ];
  for (const keyword of dangerousKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(sql)) {
      return false;
    }
  }
  return true;
}

/**
 * Execute a natural language query over business database tables.
 */
export async function queryBusinessData(
  question: string,
  businessId: string
): Promise<{ sqlQuery: string; results: any[]; explanation: string }> {
  try {
    // 1. Generate SQL from question
    const prompt = `${DB_SCHEMA_PROMPT}\n\nBUSINESS ID Context: ${businessId}\n\nUSER QUESTION: "${question}"\n\nGenerate SQL query:`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const outputText = response.text || "";
    const sqlMatch = outputText.match(/```sql([\s\S]*?)```/) || outputText.match(/```([\s\S]*?)```/);
    let sqlQuery = sqlMatch ? sqlMatch[1].trim() : outputText.trim();
    
    // Inject the business id context parameter if not already set
    sqlQuery = sqlQuery.replace(/\$BUSINESS_ID/g, businessId);

    console.log(`[SQL Agent] Generated SQL: ${sqlQuery}`);

    if (!isQuerySafe(sqlQuery)) {
      throw new Error("Generated SQL query failed security verification (non-select or mutation detected)");
    }

    // 2. Execute SQL query
    let results: any[] = [];
    try {
      const dbResult = await db.execute(sqlQuery);
      results = dbResult.rows || [];
    } catch (dbError: any) {
      console.error("[SQL Agent] Database execution error:", dbError);
      return {
        sqlQuery,
        results: [],
        explanation: `I generated the query: \`${sqlQuery}\`, but encountered an error running it: ${dbError.message}`
      };
    }

    // 3. Explain results
    const explanationPrompt = `
You are a helpful AI Business Advisor. Explain the database query results to the user in a natural, clear manner.
Do not mention SQL, databases, or table names. Focus on the business answer.

USER QUESTION: "${question}"
SQL EXECUTED: "${sqlQuery}"
QUERY RESULTS (JSON):
${JSON.stringify(results, null, 2)}

Provide a concise, direct explanation with key numbers highlighted.
`;

    const explanationResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: explanationPrompt,
    });

    return {
      sqlQuery,
      results,
      explanation: explanationResponse.text || "No explanation generated."
    };
  } catch (error: any) {
    console.error("[SQL Agent] Error in queryBusinessData:", error);
    throw error;
  }
}
