// Gemini Embeddings - text-embedding-004 model for RAG pipeline
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const CHUNK_SIZE = 500; // approximate tokens (chars / 4)
const CHUNK_OVERLAP = 50;

export function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const end = Math.min(i + CHUNK_SIZE, words.length);
    chunks.push(words.slice(i, end).join(" "));
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks.filter(c => c.trim().length > 10);
}

export function datasetToText(headers: string[], data: Record<string, any>[]): string[] {
  // Convert all rows to a flat text representation, then chunk with proper overlap
  const headerDesc = `Dataset columns: ${headers.join(", ")}. Total rows: ${data.length}.`;
  const rowLines = data.map(row =>
    headers.map(h => `${h}: ${row[h] ?? ""}`).join(" | ")
  );
  const fullText = [headerDesc, ...rowLines].join("\n");

  // Use chunkText for consistent 500-word / ~50-word overlap chunking
  return chunkText(fullText);
}

export async function embedText(text: string): Promise<number[]> {
  try {
    const result = await ai.models.embedContent({
      model: "text-embedding-005",
      contents: text,
    });
    return result.embeddings?.[0]?.values ?? [];
  } catch (error) {
    // Embedding failure is non-critical - RAG will just skip indexing
    return [];
  }
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  const BATCH = 100; // Batch content requests in groups of 100
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    try {
      const result = await ai.models.embedContent({
        model: "text-embedding-004",
        contents: batch,
      });
      const batchEmbeds = result.embeddings?.map(e => e.values ?? []) ?? [];
      embeddings.push(...batchEmbeds);
    } catch (error) {
      console.error(`Batch embedding error for indices ${i} to ${i + batch.length}, falling back:`, error);
      const individualResults = await Promise.all(batch.map(t => embedText(t)));
      embeddings.push(...individualResults);
    }
    // Small delay to avoid rate limiting
    if (i + BATCH < texts.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }
  return embeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
