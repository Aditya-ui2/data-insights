// Gemini AI Service - javascript_gemini blueprint
import { GoogleGenAI } from "@google/genai";
import type { DashboardConfig, ChartConfig } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface GenerateDashboardParams {
  headers: string[];
  data: Record<string, any>[];
  spreadsheetName: string;
  sheetName: string;
  ragContext?: string;
  compactStats?: Record<string, any>;
}

export async function generateDashboard(params: GenerateDashboardParams): Promise<DashboardConfig> {
  const { headers, data, spreadsheetName, sheetName, ragContext = "", compactStats } = params;

  // Build compact stats — only top values, no raw data dump
  const stats = compactStats || (() => {
    const s: Record<string, any> = {};
    const sample = data.slice(0, 300);
    headers.forEach(header => {
      const values = sample.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== "");
      const numericValues = values.map(v => parseFloat(String(v))).filter(n => !isNaN(n));
      const isNumeric = numericValues.length > values.length * 0.5;
      const valueCounts: Record<string, number> = {};
      values.forEach(v => {
        const k = String(v).toLowerCase().trim().slice(0, 40);
        valueCounts[k] = (valueCounts[k] || 0) + 1;
      });
      s[header] = {
        count: values.length,
        unique: Object.keys(valueCounts).length,
        top5: Object.entries(valueCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
        ...(isNumeric ? {
          isNumeric: true,
          sum: Math.round(numericValues.reduce((a, b) => a + b, 0)),
          avg: Math.round(numericValues.reduce((a, b) => a + b, 0) / numericValues.length),
          min: Math.min(...numericValues),
          max: Math.max(...numericValues)
        } : { isNumeric: false })
      };
    });
    return s;
  })();

  const prompt = `You are a BI analyst. Generate a dashboard config as JSON.

DATASET: "${spreadsheetName}" | Total rows: ${data.length}
COLUMNS (use EXACT names): ${headers.map(h => `"${h}"`).join(", ")}

${ragContext ? `RAG CONTEXT (key insights from the data):\n${ragContext}\n` : ""}

COLUMN STATS (isNumeric=true means numeric column suitable for sum/avg KPIs and chart values):
${JSON.stringify(stats)}

SAMPLE (3 rows):
${JSON.stringify(data.slice(0, 3))}

RULES:
1. dataKey and labelKey MUST be EXACT column names from the COLUMNS list above
2. For KPI cards: use numeric columns (isNumeric:true) for dataKey to show real sums/totals
3. For bar/line charts: dataKey = numeric column, labelKey = category/text column
4. For pie charts: dataKey = numeric column OR category column, labelKey = category column
5. KPI insights field: write "sum of <column>" or "total records" or "average of <column>"
6. Do NOT invent column names

Return ONLY valid JSON (no markdown):
{"charts":[
  {"id":"kpi-1","type":"kpi","title":"Total Sales","dataKey":"<numeric_col>","insights":"sum of <numeric_col>"},
  {"id":"kpi-2","type":"kpi","title":"Total Received","dataKey":"<numeric_col>","insights":"sum of <numeric_col>"},
  {"id":"kpi-3","type":"kpi","title":"Total Records","dataKey":"<any_col>","insights":"total records"},
  {"id":"kpi-4","type":"kpi","title":"Unique Customers","dataKey":"<category_col>","insights":"unique count"},
  {"id":"bar-1","type":"bar","title":"...","dataKey":"<numeric_col>","labelKey":"<category_col>","insights":"..."},
  {"id":"pie-1","type":"pie","title":"...","dataKey":"<numeric_col>","labelKey":"<category_col>","insights":"..."},
  {"id":"line-1","type":"line","title":"...","dataKey":"<numeric_col>","labelKey":"<date_or_category_col>","insights":"..."}
],"summary":"..."}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: { responseMimeType: "application/json" },
      contents: prompt
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");

    // Strip any markdown wrapping just in case
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const config = JSON.parse(cleaned) as { charts: ChartConfig[]; summary: string };

    return {
      charts: config.charts,
      summary: config.summary,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Gemini dashboard generation error:", error);
    throw new Error("Failed to generate dashboard with AI");
  }
}

export interface ChatWithDataParams {
  question: string;
  headers: string[];
  data: Record<string, any>[];
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  ragContext?: string;
}

export async function chatWithData(params: ChatWithDataParams): Promise<string> {
  const { question, headers, data, conversationHistory = [], ragContext = "" } = params;
  
  const questionLower = question.toLowerCase().trim();
  
  // Check if question contains data-related keywords (should NOT be treated as greeting)
  const dataKeywords = ['count', 'how many', 'total', 'sum', 'average', 'show', 'tell', 'list', 'find', 'what', 'which', 'where', 'when', 'who', 'give', 'get', 'number', 'amount', 'value', 'data', 'record', 'row', 'column', 'filter', 'search', 'query', 'report', 'analysis', 'calculate', 'top', 'bottom', 'highest', 'lowest', 'max', 'min', 'percentage', 'percent', 'ratio', 'compare', 'difference', 'between', 'for', 'by', 'from', 'date', 'month', 'year', 'week', 'day'];
  const hasDataKeyword = dataKeywords.some(kw => questionLower.includes(kw));
  
  // Detect simple greetings and casual messages (ONLY if no data keywords present)
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'hola', 'namaste', 'thanks', 'thank you', 'bye', 'goodbye', 'cool', 'nice', 'great', 'awesome', 'got it', 'alright'];
  const standaloneResponses = ['ok', 'okay', 'sure', 'yes', 'no', 'yep', 'nope'];
  
  // Only treat as greeting if it's a pure greeting with no data question attached
  const isSimpleGreeting = !hasDataKeyword && (
    greetings.some(g => questionLower === g || questionLower === g + '!' || questionLower === g + '.') ||
    standaloneResponses.some(s => questionLower === s || questionLower === s + '!' || questionLower === s + '.')
  );
  
  // Detect simple questions about the assistant
  const aboutMePatterns = ['who are you', 'what are you', 'what can you do', 'how do you work', 'what is this', 'help me', 'help'];
  const isAboutAssistant = aboutMePatterns.some(p => questionLower.includes(p));
  
  // For simple greetings, respond briefly without data analysis
  if (isSimpleGreeting) {
    const greetingResponses: Record<string, string> = {
      'hello': 'Hello! How can I help you analyze your data today?',
      'hi': 'Hi there! Ready to explore your data. What would you like to know?',
      'hey': 'Hey! What insights are you looking for in your data?',
      'good morning': 'Good morning! How can I assist with your data analysis today?',
      'good afternoon': 'Good afternoon! What would you like to explore in your dataset?',
      'good evening': 'Good evening! Ready to help with your data questions.',
      'thanks': 'You are welcome! Let me know if you need anything else.',
      'thank you': 'My pleasure! Feel free to ask more questions about your data.',
      'bye': 'Goodbye! Come back anytime you need data insights.',
      'goodbye': 'Take care! Your data will be here when you return.',
      'ok': 'Great! What else would you like to know?',
      'okay': 'Perfect. Any other questions about your data?',
      'cool': 'Glad that helped! What else can I analyze for you?',
      'nice': 'Thank you! Ready for your next question.',
      'great': 'Excellent! What other insights are you looking for?',
      'awesome': 'Happy to help! What else would you like to explore?',
      'got it': 'Perfect. Let me know if you need more analysis.',
      'sure': 'Great! What would you like me to look into?',
      'yes': 'Understood. What can I help you with next?',
      'no': 'Alright. Feel free to ask something else.',
      'yep': 'Got it! Ready for your next question.',
      'nope': 'No problem. What else can I help with?',
      'alright': 'Good! What analysis would you like me to run?'
    };
    
    for (const [key, response] of Object.entries(greetingResponses)) {
      if (questionLower.startsWith(key)) {
        return response;
      }
    }
    return 'Hello! I am your data analytics assistant. Ask me anything about your dataset.';
  }
  
  // For questions about the assistant
  if (isAboutAssistant) {
    return `I am your AI data analytics assistant. I can help you understand and analyze your dataset which has ${data.length} records across ${headers.length} columns (${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}). Ask me questions like "What are the top categories?" or "Show me the sales trend" and I will provide data-driven insights.`;
  }
  
  // Dataset info
  const totalRecords = data.length;
  const isLargeDataset = totalRecords > 500;
  
  // Pre-compute statistics for accurate answers (case-insensitive)
  const columnStats: Record<string, any> = {};
  
  // Detect potential name columns and track common names
  const potentialNameColumns: string[] = [];
  const commonNames: Record<string, string[]> = {}; // columnName -> list of duplicate names
  
  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== "");
    
    // Case-insensitive value counts
    const valueCounts: Record<string, { count: number; displayName: string }> = {};
    values.forEach(v => {
      const normalizedKey = String(v).toLowerCase().trim();
      if (!valueCounts[normalizedKey]) {
        valueCounts[normalizedKey] = { count: 0, displayName: String(v).trim() };
      }
      valueCounts[normalizedKey].count++;
    });
    
    const uniqueCount = Object.keys(valueCounts).length;
    
    // Check if this might be a name column (many unique values, text-like)
    const headerLower = header.toLowerCase();
    if (headerLower.includes('name') || headerLower.includes('person') || headerLower.includes('assigned') || headerLower.includes('owner') || headerLower.includes('agent')) {
      potentialNameColumns.push(header);
      
      // Find names with duplicates (common names)
      const duplicateNames = Object.entries(valueCounts)
        .filter(([_, v]) => v.count > 1)
        .map(([_, v]) => v.displayName);
      
      if (duplicateNames.length > 0) {
        commonNames[header] = duplicateNames.slice(0, 10);
      }
    }
    
    // Check if numeric
    const numericValues = values.map(v => parseFloat(String(v))).filter(n => !isNaN(n));
    const isNumeric = numericValues.length > values.length * 0.5;
    
    // Format valueCounts for AI (include count)
    const formattedValueCounts: Record<string, number> = {};
    Object.values(valueCounts).forEach(({ displayName, count }) => {
      formattedValueCounts[displayName] = count;
    });
    
    columnStats[header] = {
      totalNonEmpty: values.length,
      uniqueCount,
      valueCounts: formattedValueCounts,
      isNumeric,
      ...(isNumeric && numericValues.length > 0 ? {
        sum: numericValues.reduce((a, b) => a + b, 0),
        average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues)
      } : {})
    };
  });
  
  // Check if user is asking about a common name without specifying unique ID
  const mentionedNames: string[] = [];
  Object.values(commonNames).flat().forEach(name => {
    if (questionLower.includes(name.toLowerCase())) {
      mentionedNames.push(name);
    }
  });
  
  // Find potential ID columns
  const idColumns = headers.filter(h => {
    const hLower = h.toLowerCase();
    return hLower.includes('id') || hLower.includes('code') || hLower.includes('number') || hLower === 'sr' || hLower === 'sno';
  });
  
  let conversationContext = "";
  if (conversationHistory.length > 0) {
    conversationContext = "\n\nPrevious conversation:\n" + 
      conversationHistory.map(m => `${m.role}: ${m.content}`).join("\n");
  }
  
  // Determine question complexity for response length
  const complexIndicators = ['analyze', 'compare', 'trend', 'pattern', 'insight', 'recommend', 'strategy', 'why', 'explain', 'detail', 'breakdown', 'distribution', 'correlation', 'forecast', 'predict', 'deep dive', 'comprehensive', 'list', 'show all', 'give me all'];
  const isComplexQuestion = complexIndicators.some(ind => questionLower.includes(ind)) || questionLower.length > 100;
  
  // Build context about common names and IDs
  let nameWarning = "";
  if (mentionedNames.length > 0 && idColumns.length > 0) {
    nameWarning = `\n\nNOTE: The name "${mentionedNames[0]}" appears multiple times in the data. If the user needs specific person data, ask them for a unique identifier like ${idColumns[0]}.`;
  }
  
  // Dataset size info
  const datasetInfo = isLargeDataset 
    ? `This is a LARGE dataset with ${totalRecords} records. Provide summarized insights, not raw data listings.`
    : `Dataset has ${totalRecords} records.`;

  const prompt = `You are a data analyst. Answer the question in 1-3 short sentences using exact numbers from the data. No greetings, no formatting, no follow-up questions, no numbered points.

DATASET:
- ${totalRecords} records, columns: ${headers.join(", ")}
- ${datasetInfo}

KEY STATS:
${JSON.stringify(columnStats, null, 2)}

SAMPLE ROWS:
${JSON.stringify(data.slice(0, 10), null, 2)}
${ragContext ? `\nCONTEXT:\n${ragContext}\n` : ''}
${conversationContext}

QUESTION: ${question}

Answer in 1-3 sentences with exact numbers only:`;

  try {
    console.log("Sending chat request to Gemini...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    
    // Access the text content from the response
    let text = "";
    if (response.text) {
      text = response.text;
    } else if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
      text = response.candidates[0].content.parts[0].text;
    }
    
    console.log("Response text:", text?.slice(0, 200));

    if (!text || text.trim() === "") {
      console.error("Empty response from Gemini. Full response:", JSON.stringify(response, null, 2));
      return "I couldn't generate a response. Please try rephrasing your question.";
    }

    // Clean up any markdown formatting that slipped through
    let cleanText = text
      .replace(/\*\*/g, '')           // Remove bold asterisks
      .replace(/\*/g, '')             // Remove italic asterisks
      .replace(/^[-•]\s+/gm, '')      // Remove bullet point dashes/dots at start of lines
      .replace(/^#+\s+/gm, '')        // Remove markdown headers
      .replace(/`{1,3}[^`]*`{1,3}/g, (match) => match.replace(/`/g, ''))  // Remove code backticks but keep content
      .trim();

    return cleanText;
  } catch (error) {
    console.error("Gemini chat error:", error);
    throw new Error("Failed to get AI response");
  }
}

function getColumnLetter(colIdx: number): string {
  let letter = "";
  let tempIdx = colIdx;
  while (tempIdx >= 0) {
    letter = String.fromCharCode((tempIdx % 26) + 65) + letter;
    tempIdx = Math.floor(tempIdx / 26) - 1;
  }
  return letter;
}

export interface FormulaResponse {
  formula: string;
  explanation: string;
}

export async function generateFormula(
  promptStr: string,
  headers: string[],
  selectedCell?: { rowIdx: number; colKey: string }
): Promise<FormulaResponse> {
  const columnMapping = headers.map((h, idx) => `- Column ${getColumnLetter(idx)}: "${h}"`).join("\n");
  const targetRow = selectedCell ? selectedCell.rowIdx + 1 : 2; // Default to row 2 for formulas if not selected

  const systemPrompt = `You are an Excel and Google Sheets Formula Assistant.
Generate a valid spreadsheet formula based on the user request and columns list.

COLUMNS LIST:
${columnMapping}

TARGET ROW FOR FORMULA: Row ${targetRow} (e.g. use references like A${targetRow}, B${targetRow})

RULES:
1. Return ONLY a JSON object containing:
   - "formula": The valid formula starting with "=" (e.g., "=C${targetRow}-D${targetRow}" or "=SUM(C2:C${targetRow})")
   - "explanation": A very brief explanation of what the formula does.
2. Use EXACT column letters based on the mapping above.
3. Keep the formula clean. Do NOT write markdown code blocks in the output.

JSON Output:`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: { responseMimeType: "application/json" },
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nUser request: "${promptStr}"` }] }
      ]
    });

    const text = response.text?.trim() || "";
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned) as FormulaResponse;
  } catch (error) {
    console.error("Gemini formula gen failed, returning fallback:", error);
    // Rule-based fallback
    const lowerPrompt = promptStr.toLowerCase();
    let formula = `=A${targetRow}`;
    let explanation = "Fallback formula generated due to AI service timeout.";

    const priceColIdx = headers.findIndex(h => /price|amount|total|sales/i.test(h));
    const costColIdx = headers.findIndex(h => /cost|discount|tax/i.test(h));

    const priceLetter = priceColIdx !== -1 ? getColumnLetter(priceColIdx) : "C";
    const costLetter = costColIdx !== -1 ? getColumnLetter(costColIdx) : "D";

    if (lowerPrompt.includes("profit") || lowerPrompt.includes("margin") || lowerPrompt.includes("net")) {
      formula = `=${priceLetter}${targetRow}-${costLetter}${targetRow}`;
      explanation = `Subtracted Cost (${costLetter}${targetRow}) from Total (${priceLetter}${targetRow}) to calculate profit.`;
    } else if (lowerPrompt.includes("sum") || lowerPrompt.includes("total")) {
      formula = `=SUM(${priceLetter}2:${priceLetter}${targetRow})`;
      explanation = `Sum of column ${headers[priceColIdx] || 'C'} from row 2 to ${targetRow}.`;
    } else if (lowerPrompt.includes("growth") || lowerPrompt.includes("percent") || lowerPrompt.includes("%")) {
      formula = `=(${priceLetter}${targetRow}-${costLetter}${targetRow})/${costLetter}${targetRow}`;
      explanation = `Percentage change formula: (${priceLetter}${targetRow} - ${costLetter}${targetRow}) / ${costLetter}${targetRow}.`;
    }

    return { formula, explanation };
  }
}

export interface ChartResponse {
  type: "bar" | "line" | "pie" | "area" | "scatter";
  xAxis: string;
  yAxis: string;
  title: string;
  explanation: string;
}

export async function generateChart(
  promptStr: string,
  headers: string[]
): Promise<ChartResponse> {
  const systemPrompt = `You are a BI Chart Assistant. Automatically choose the best chart config (bar, line, pie, area, scatter) based on the columns list and user prompt.

COLUMNS LIST:
${headers.map(h => `"${h}"`).join(", ")}

RULES:
1. Return ONLY a JSON object containing:
   - "type": "bar", "line", "pie", "area", or "scatter"
   - "xAxis": The EXACT column name for the X axis (categorical or time column)
   - "yAxis": The EXACT column name for the Y axis (numeric column suitable for values)
   - "title": A descriptive title for the chart
   - "explanation": Brief reasoning for this chart configuration.
2. Choose xAxis and yAxis strictly from the COLUMNS LIST.
3. Keep the JSON clean. Do NOT write markdown wrapping.

JSON Output:`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: { responseMimeType: "application/json" },
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nUser request: "${promptStr}"` }] }
      ]
    });

    const text = response.text?.trim() || "";
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned) as ChartResponse;
  } catch (error) {
    console.error("Gemini chart gen failed, returning fallback:", error);
    // Rule-based fallback
    const numericCol = headers.find(h => /price|amount|total|sales|quantity/i.test(h)) || headers[0];
    const catCol = headers.find(h => /date|month|year|category|name|status|product/i.test(h)) || headers[0];
    const type = /date|month|trend/i.test(promptStr) ? "line" : "bar";

    return {
      type,
      xAxis: catCol,
      yAxis: numericCol,
      title: `${numericCol} by ${catCol}`,
      explanation: `Analyzed dataset and configured a ${type} chart of ${numericCol} over ${catCol}.`
    };
  }
}

export interface PivotResponse {
  rows: string[];
  columns: string[];
  values: {
    column: string;
    aggregator: "sum" | "count" | "avg";
  }[];
  explanation: string;
}

export async function generatePivot(
  promptStr: string,
  headers: string[]
): Promise<PivotResponse> {
  const systemPrompt = `You are a Pivot Table Assistant. Generate a valid pivot configuration from the user request.

COLUMNS LIST:
${headers.map(h => `"${h}"`).join(", ")}

RULES:
1. Return ONLY a JSON object containing:
   - "rows": Array of column names to group as rows (e.g. ["product", "status"])
   - "columns": Array of column names to group as columns (can be empty)
   - "values": Array of objects: {"column": "colName", "aggregator": "sum" | "count" | "avg"}
   - "explanation": Brief explanation of the pivot structure.
2. Select all column names strictly from the COLUMNS LIST.
3. Keep the JSON clean. Do NOT write markdown wrapping.

JSON Output:`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: { responseMimeType: "application/json" },
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nUser request: "${promptStr}"` }] }
      ]
    });

    const text = response.text?.trim() || "";
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned) as PivotResponse;
  } catch (error) {
    console.error("Gemini pivot gen failed, returning fallback:", error);
    // Rule-based fallback
    const numericCol = headers.find(h => /price|amount|total|sales|quantity/i.test(h)) || headers[0];
    const catCol = headers.find(h => /category|name|status|product/i.test(h)) || headers[0];
    
    return {
      rows: [catCol],
      columns: [],
      values: [{ column: numericCol, aggregator: "sum" }],
      explanation: `Grouped records by ${catCol} and summed up ${numericCol} values.`
    };
  }
}
