// Gemini AI Service - javascript_gemini blueprint
import { GoogleGenAI } from "@google/genai";
import type { DashboardConfig, ChartConfig } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface GenerateDashboardParams {
  headers: string[];
  data: Record<string, any>[];
  spreadsheetName: string;
  sheetName: string;
}

export async function generateDashboard(params: GenerateDashboardParams): Promise<DashboardConfig> {
  const { headers, data, spreadsheetName, sheetName } = params;
  
  // Pre-compute comprehensive statistics for accurate dashboard
  const columnStats: Record<string, any> = {};
  
  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== "");
    const valueCounts: Record<string, number> = {};
    values.forEach(v => {
      const key = String(v).trim();
      valueCounts[key] = (valueCounts[key] || 0) + 1;
    });
    
    const numericValues = values.map(v => parseFloat(String(v))).filter(n => !isNaN(n));
    const isNumeric = numericValues.length > values.length * 0.5;
    
    columnStats[header] = {
      totalNonEmpty: values.length,
      uniqueCount: Object.keys(valueCounts).length,
      topValues: Object.entries(valueCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      isNumeric,
      ...(isNumeric && numericValues.length > 0 ? {
        sum: numericValues.reduce((a, b) => a + b, 0),
        average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues)
      } : {})
    };
  });
  
  // Normalize data for case-insensitive analysis
  const normalizedStats: Record<string, any> = {};
  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== "");
    
    // Case-insensitive value counts (merge "Sales" and "sales")
    const valueCounts: Record<string, { count: number; displayName: string }> = {};
    values.forEach(v => {
      const normalizedKey = String(v).toLowerCase().trim();
      if (!valueCounts[normalizedKey]) {
        valueCounts[normalizedKey] = { count: 0, displayName: String(v).trim() };
      }
      valueCounts[normalizedKey].count++;
    });
    
    const numericValues = values.map(v => parseFloat(String(v))).filter(n => !isNaN(n));
    const isNumeric = numericValues.length > values.length * 0.5;
    
    normalizedStats[header] = {
      totalNonEmpty: values.length,
      uniqueCount: Object.keys(valueCounts).length,
      topValues: Object.entries(valueCounts)
        .map(([key, val]) => [val.displayName, val.count])
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10),
      isNumeric,
      ...(isNumeric && numericValues.length > 0 ? {
        sum: numericValues.reduce((a, b) => a + b, 0),
        average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues)
      } : {})
    };
  });
  
  const prompt = `You are an expert business intelligence analyst. Create an ACCURATE, visually appealing dashboard.

DATASET: "${spreadsheetName}" - Sheet: "${sheetName}"
TOTAL RECORDS: ${data.length}
COLUMNS: ${headers.join(", ")}

COLUMN STATISTICS (CASE-INSENSITIVE - "Sales" and "sales" are merged):
${JSON.stringify(normalizedStats, null, 2)}

SAMPLE DATA:
${JSON.stringify(data.slice(0, 5), null, 2)}

YOU MUST CREATE EXACTLY:
1. 4 KPI cards showing key metrics (Total Records, unique counts, rates, averages)
2. 4 charts - one of EACH type:
   - 1 "bar" chart (for horizontal bar chart - comparing categories)
   - 1 "bar" chart (second bar will render as vertical - different data)
   - 1 "pie" chart (for proportions - max 6-8 categories)
   - 1 "line" chart (for trends or ordered data)
3. Brief executive summary with key numbers

IMPORTANT RULES:
1. Use EXACT numbers from statistics - no estimation
2. Data is case-insensitive: "Sales", "SALES", "sales" count as the same value
3. dataKey = column to measure/aggregate
4. labelKey = column for category labels
5. Each chart MUST use different columns/data for variety
6. KPI titles should be descriptive: "Total Records", "Unique Persons", "Success Rate"

Respond with valid JSON:
{
  "charts": [
    {"id": "kpi-1", "type": "kpi", "title": "Total Records", "dataKey": "column_name", "insights": "insight with number"},
    {"id": "kpi-2", "type": "kpi", "title": "Unique Categories", "dataKey": "column_name", "insights": "insight"},
    {"id": "kpi-3", "type": "kpi", "title": "Some Rate", "dataKey": "column_name", "insights": "insight"},
    {"id": "kpi-4", "type": "kpi", "title": "Average/Count", "dataKey": "column_name", "insights": "insight"},
    {"id": "bar-1", "type": "bar", "title": "Chart Title", "dataKey": "column", "labelKey": "category_column", "insights": "insight"},
    {"id": "bar-2", "type": "bar", "title": "Another Chart", "dataKey": "column", "labelKey": "different_column", "insights": "insight"},
    {"id": "pie-1", "type": "pie", "title": "Distribution", "dataKey": "column", "labelKey": "category", "insights": "insight"},
    {"id": "line-1", "type": "line", "title": "Trend", "dataKey": "column", "labelKey": "order_column", "insights": "insight"}
  ],
  "summary": "Executive summary with exact numbers from data"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            charts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string" },
                  title: { type: "string" },
                  dataKey: { type: "string" },
                  labelKey: { type: "string" },
                  valueKeys: { type: "array", items: { type: "string" } },
                  color: { type: "string" },
                  insights: { type: "string" }
                },
                required: ["id", "type", "title", "dataKey"]
              }
            },
            summary: { type: "string" }
          },
          required: ["charts", "summary"]
        }
      },
      contents: prompt
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    const config = JSON.parse(text) as { charts: ChartConfig[]; summary: string };
    
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

  const prompt = `You are a world-class data analyst who presents insights in a beautiful, easy-to-understand format. Your responses are clear, organized, and visually structured.

DATASET OVERVIEW:
- Total Records: ${totalRecords}
- Columns: ${headers.join(", ")}
- ${datasetInfo}
${idColumns.length > 0 ? `- Unique ID columns available: ${idColumns.join(", ")}` : ''}
${potentialNameColumns.length > 0 ? `- Name/Person columns: ${potentialNameColumns.join(", ")}` : ''}
${nameWarning}

COLUMN STATISTICS (CASE-INSENSITIVE - use these for EXACT answers):
${JSON.stringify(columnStats, null, 2)}

SAMPLE DATA (first 10 rows):
${JSON.stringify(data.slice(0, 10), null, 2)}
${ragContext ? `\nSEMANTICALLY RELEVANT CONTEXT (RAG-retrieved):\n${ragContext}\n` : ''}
${conversationContext}

QUESTION: ${question}

RESPONSE FORMAT - CRITICAL RULES:

1. STRUCTURE YOUR RESPONSE BEAUTIFULLY:
   - Start with a brief 1-2 sentence summary answering the main question
   - Add a blank line
   - Present key findings as numbered points with proper spacing
   - Each point should be on its own line with a blank line between points
   - End with 2-3 suggested follow-up questions

2. FORMATTING RULES:
   - Use numbered points: "1." "2." "3." etc.
   - Add a BLANK LINE between each numbered point for readability
   - NO asterisks (*), NO bullets (-), NO markdown
   - NO code blocks or technical formatting
   - Keep each point concise but insightful

3. ALWAYS END WITH FOLLOW-UP SUGGESTIONS:
   After your analysis, add:
   "Would you like to explore:"
   Then list 2-3 relevant follow-up questions they could ask

4. DATA PRESENTATION:
   - Use EXACT numbers from the statistics
   - Present percentages when relevant (e.g., "45 visits (34% of total)")
   - Compare values to give context (e.g., "highest", "3x more than average")
   - Highlight interesting patterns or anomalies

EXAMPLE RESPONSE FORMAT:

Based on the data, Vivek Chaturvedi is the most active runner with 86 total visits.

Here are the key insights:

1. Vivek Chaturvedi leads with 86 visits, representing 65% of all runner activity in the dataset.

2. Sunil Tanwar follows with 41 visits, which is less than half of Vivek's activity level.

3. The data shows consistent activity throughout December 2025, with peak days on the 11th and 12th.

Would you like to explore:
- Which locations did each runner visit most frequently?
- What project types did Vivek handle compared to Sunil?
- How does visit frequency correlate with project stages?

---

Now answer the question with this beautiful, readable format.`;

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
