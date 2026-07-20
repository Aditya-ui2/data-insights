/**
 * AI Service Router - Intelligent routing for different AI tasks
 * Routes requests to optimal providers: Groq (fast), Gemini (deep analysis), Cohere (embeddings)
 * Includes fallback mechanisms and comprehensive error handling
 */

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

// Initialize clients securely
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// ============================================================================
// TYPES
// ============================================================================

export interface AIRouterOptions {
  maxRetries?: number;
  timeout?: number;
  fallbackEnabled?: boolean;
}

export interface FastChatParams {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface DeepAnalysisParams {
  prompt: string;
  contextData?: Record<string, any>;
  maxTokens?: number;
  temperature?: number;
}

export interface EmbeddingsParams {
  text: string | string[];
  model?: "cohere" | "gemini";
}

// ============================================================================
// FAST CHAT - Groq (Ultra-fast, real-time queries)
// ============================================================================

/**
 * Fast chat for small, instant queries (UI interactions, simple questions)
 * Primary: Groq (llama3-8b-8192) - Fastest response
 * Fallback: Gemini (gemini-1.5-flash) if Groq fails
 */
export async function fastChat(
  params: FastChatParams,
  options: AIRouterOptions = {}
): Promise<string> {
  const { prompt, maxTokens = 500, temperature = 0.7 } = params;
  const { maxRetries = 1, fallbackEnabled = true } = options;

  try {
    console.log("[AI Router] 🚀 FastChat → Routing to Groq (llama3-8b-8192)");

    const response = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Groq");
    }

    console.log("[AI Router] ✅ Groq response successful");
    return content;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.status || error?.code;

    console.error(`[AI Router] ❌ Groq failed: ${errorMessage} (Code: ${errorCode})`);

    // Check if error is rate limit or server error
    const isRetryableError =
      errorCode === 429 || // Rate limit
      errorCode === 500 || // Server error
      errorCode === 503 || // Service unavailable
      errorMessage.includes("rate_limit") ||
      errorMessage.includes("timeout");

    if (isRetryableError && fallbackEnabled) {
      console.log("[AI Router] 🔄 Activating fallback: Groq → Gemini (gemini-1.5-flash)");
      return await fastChatFallback(prompt, maxTokens, temperature);
    }

    throw new Error(`FastChat failed on Groq: ${errorMessage}`);
  }
}

/**
 * Fallback handler for fastChat - uses Gemini
 */
async function fastChatFallback(
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  try {
    console.log("[AI Router] 🔀 FastChat Fallback → Gemini (gemini-1.5-flash)");

    const response = await gemini.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    } as any);

    const content = response.text;
    if (!content) {
      throw new Error("Empty response from Gemini fallback");
    }

    console.log("[AI Router] ✅ Gemini fallback response successful");
    return content;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error(`[AI Router] ❌ Gemini fallback failed: ${errorMessage}`);
    throw new Error(`FastChat fallback failed: ${errorMessage}`);
  }
}

// ============================================================================
// DEEP ANALYSIS - Gemini (Complex data analysis, strategy, MBA insights)
// ============================================================================

/**
 * Deep analysis for large, complex tasks (Virtual MBA, Go-To-Market, data analysis)
 * Primary: Gemini (gemini-1.5-pro) - High context window for complex analysis
 * Fallback: Groq (llama3-70b) if Gemini fails
 */
export async function deepAnalysis(
  params: DeepAnalysisParams,
  options: AIRouterOptions = {}
): Promise<string> {
  const { prompt, contextData, maxTokens = 2000, temperature = 0.6 } = params;
  const { maxRetries = 1, fallbackEnabled = true } = options;

  try {
    console.log("[AI Router] 🧠 DeepAnalysis → Routing to Gemini (gemini-1.5-pro)");

    // Build enhanced prompt with context
    let enhancedPrompt = prompt;
    if (contextData && Object.keys(contextData).length > 0) {
      const contextStr = JSON.stringify(contextData, null, 2);
      enhancedPrompt = `CONTEXT DATA:\n${contextStr}\n\nQUESTION/TASK:\n${prompt}`;
    }

    const response = await gemini.models.generateContent({
      model: "gemini-1.5-pro",
      contents: enhancedPrompt,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    } as any);

    const content = response.text;
    if (!content) {
      throw new Error("Empty response from Gemini");
    }

    console.log("[AI Router] ✅ Gemini deep analysis response successful");
    return content;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error(`[AI Router] ❌ Gemini failed: ${errorMessage}`);

    if (fallbackEnabled) {
      console.log("[AI Router] 🔄 Activating fallback: Gemini → Groq (llama3-70b)");
      return await deepAnalysisFallback(prompt, maxTokens, temperature);
    }

    throw new Error(`DeepAnalysis failed on Gemini: ${errorMessage}`);
  }
}

/**
 * Fallback handler for deepAnalysis - uses Groq with 70B model
 */
async function deepAnalysisFallback(
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  try {
    console.log("[AI Router] 🔀 DeepAnalysis Fallback → Groq (llama3-70b)");

    const response = await groq.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Groq fallback");
    }

    console.log("[AI Router] ✅ Groq fallback response successful");
    return content;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error(`[AI Router] ❌ Groq fallback failed: ${errorMessage}`);
    throw new Error(`DeepAnalysis fallback failed: ${errorMessage}`);
  }
}

// ============================================================================
// EMBEDDINGS - Generate vector embeddings for pgvector database
// ============================================================================

/**
 * Generate embeddings for vector database (AWS pgvector)
 * Converts text into dense vectors for semantic search and similarity
 * Uses Gemini's embedding model (stable and reliable)
 */
export async function generateEmbeddings(
  params: EmbeddingsParams,
  options: AIRouterOptions = {}
): Promise<number[]> {
  const { text, model = "gemini" } = params;
  const { fallbackEnabled = true } = options;

  // Normalize input to array
  const textArray = typeof text === "string" ? [text] : text;
  const textToEmbed = textArray.join(" ");

  if (!textToEmbed.trim()) {
    throw new Error("Empty text provided for embeddings");
  }

  try {
    console.log("[AI Router] 📊 GenerateEmbeddings → Routing to Gemini (embedding-001)");

    // Use Gemini's embedding model
    const response = await gemini.models.embedContent({
      model: "embedding-001",
      contents: { parts: [{ text: textToEmbed }] },
    });

    const embedding = response.embeddings?.[0]?.values;
    if (!embedding || embedding.length === 0) {
      throw new Error("Empty embedding from Gemini");
    }

    console.log(`[AI Router] ✅ Generated embedding (${embedding.length} dimensions)`);
    return embedding;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error(`[AI Router] ❌ Gemini embedding failed: ${errorMessage}`);

    if (fallbackEnabled && model === "gemini") {
      console.log("[AI Router] 📌 Note: Embeddings are specialized - fallback not available");
      throw new Error(`Embeddings failed: ${errorMessage}`);
    }

    throw new Error(`GenerateEmbeddings failed: ${errorMessage}`);
  }
}

// ============================================================================
// HEALTH CHECK - Verify all AI services are operational
// ============================================================================

export interface HealthCheckResult {
  timestamp: string;
  services: {
    groq: { status: "operational" | "failed"; latency?: number };
    gemini: { status: "operational" | "failed"; latency?: number };
    cohere: { status: "not_configured"; reason: string };
  };
  allOperational: boolean;
}

/**
 * Health check for all AI services
 * Tests connectivity and response times
 */
export async function healthCheck(): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    timestamp: new Date().toISOString(),
    services: {
      groq: { status: "failed" },
      gemini: { status: "failed" },
      cohere: { status: "not_configured", reason: "Cohere SDK not installed" },
    },
    allOperational: false,
  };

  // Test Groq
  try {
    const start = Date.now();
    await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 10,
    });
    result.services.groq = {
      status: "operational",
      latency: Date.now() - start,
    };
  } catch (error) {
    console.error("[AI Router] Groq health check failed:", error);
  }

  // Test Gemini
  try {
    const start = Date.now();
    await gemini.models.generateContent({
      model: "gemini-1.5-flash",
      contents: "ping",
      generationConfig: { maxOutputTokens: 10 },
    } as any);
    result.services.gemini = {
      status: "operational",
      latency: Date.now() - start,
    };
  } catch (error) {
    console.error("[AI Router] Gemini health check failed:", error);
  }

  result.allOperational =
    result.services.groq.status === "operational" &&
    result.services.gemini.status === "operational";

  return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  fastChat,
  deepAnalysis,
  generateEmbeddings,
  healthCheck,
};
