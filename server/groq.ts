// Groq AI Service - Ultra-fast LLM inference using Llama models
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

export interface GroqChatParams {
  question: string;
  headers: string[];
  data: Record<string, any>[];
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  ragContext?: string;
}

export async function groqChatWithData(params: GroqChatParams): Promise<string> {
  const { question, headers, data, conversationHistory = [], ragContext = "" } = params;
  
  const questionLower = question.toLowerCase().trim();
  
  // Check for data keywords
  const dataKeywords = ['count', 'how many', 'total', 'sum', 'average', 'show', 'tell', 'list', 'find', 'what', 'which', 'where', 'when', 'who', 'give', 'get', 'number', 'amount', 'value', 'data', 'record', 'row', 'column', 'filter', 'search', 'query', 'report', 'analysis', 'calculate', 'top', 'bottom', 'highest', 'lowest', 'max', 'min', 'percentage', 'percent', 'ratio', 'compare', 'difference', 'between', 'for', 'by', 'from', 'date', 'month', 'year', 'week', 'day'];
  const hasDataKeyword = dataKeywords.some(kw => questionLower.includes(kw));
  
  // Handle greetings
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'thanks', 'thank you', 'bye', 'goodbye'];
  const isSimpleGreeting = !hasDataKeyword && greetings.some(g => questionLower === g || questionLower === g + '!');
  
  if (isSimpleGreeting) {
    const responses: Record<string, string> = {
      'hello': 'Hello! How can I help you analyze your data today?',
      'hi': 'Hi there! Ready to explore your data. What would you like to know?',
      'hey': 'Hey! What insights are you looking for?',
      'thanks': 'You are welcome! Let me know if you need anything else.',
      'thank you': 'My pleasure! Feel free to ask more questions.',
      'bye': 'Goodbye! Come back anytime.',
    };
    for (const [key, response] of Object.entries(responses)) {
      if (questionLower.startsWith(key)) return response;
    }
    return 'Hello! I am your data analytics assistant. Ask me anything about your dataset.';
  }
  
  // Pre-compute statistics (case-insensitive)
  const totalRecords = data.length;
  const columnStats: Record<string, any> = {};
  
  headers.forEach(header => {
    const values = data.map(row => row[header]).filter(v => v !== null && v !== undefined && v !== "");
    
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
    
    const formattedValueCounts: Record<string, number> = {};
    Object.values(valueCounts).forEach(({ displayName, count }) => {
      formattedValueCounts[displayName] = count;
    });
    
    columnStats[header] = {
      totalNonEmpty: values.length,
      uniqueCount: Object.keys(valueCounts).length,
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

  // Build conversation messages
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: `You are a world-class data analyst who presents insights beautifully and clearly. Your responses are organized, easy to read, and actionable.

DATASET: ${totalRecords} records, Columns: ${headers.join(", ")}

COLUMN STATISTICS:
${JSON.stringify(columnStats, null, 2)}

SAMPLE DATA:
${JSON.stringify(data.slice(0, 8), null, 2)}
${ragContext ? `\nSEMANTICALLY RELEVANT CONTEXT (RAG-retrieved):\n${ragContext}\n` : ''}
RESPONSE FORMAT - FOLLOW EXACTLY:

1. Start with a 1-2 sentence summary answering the main question

2. Add a blank line, then present key findings as numbered points:
   - Put each numbered point on its own line
   - Add a BLANK LINE between each point for spacing
   - Use percentages and comparisons for context

3. End with follow-up suggestions:
   "Would you like to explore:"
   Then list 2-3 relevant questions they could ask next

FORMATTING RULES:
- Use numbered points: "1." "2." "3." etc.
- Add BLANK LINES between points for readability
- NO asterisks (*), NO bullets (-), NO markdown
- Present exact numbers with percentages when helpful
- Highlight patterns and insights, not just raw data

EXAMPLE:

Based on the data, Residential projects dominate with 109 entries out of 127 total.

Key findings:

1. Residential projects account for 86% of all projects, showing strong focus on home construction.

2. Commercial Buildings represent only 10 projects (8%), indicating a smaller but active commercial segment.

3. Foundation/Structure is the most common stage with 74 projects, suggesting many projects are in active construction.

Would you like to explore:
- Which runners handle the most residential projects?
- What materials are most requested for residential vs commercial?
- How do project stages vary by location?`
    }
  ];

  // Add conversation history
  conversationHistory.slice(-6).forEach(msg => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    });
  });

  messages.push({ role: 'user', content: question });

  try {
    console.log("Sending chat request to Groq (Llama 3.1 70B)...");
    
    const completion = await groq.chat.completions.create({
      messages,
      model: "llama-3.1-70b-versatile",
      temperature: 0.3,
      max_tokens: 1024,
      top_p: 0.9,
    });

    let text = completion.choices[0]?.message?.content || "";
    
    if (!text.trim()) {
      return "I couldn't generate a response. Please try rephrasing your question.";
    }

    // Clean markdown formatting
    text = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^[-•]\s+/gm, '')
      .replace(/^#+\s+/gm, '')
      .replace(/`{1,3}[^`]*`{1,3}/g, (match) => match.replace(/`/g, ''))
      .trim();

    return text;
  } catch (error: any) {
    console.error("Groq chat error:", error);
    // If Groq fails, throw to fallback to Gemini
    throw new Error(`Groq API error: ${error.message}`);
  }
}

// Check if Groq is available
export function isGroqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY;
}
