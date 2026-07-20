// RAG (Retrieval-Augmented Generation) search engine
import { db } from "./db";
import { documentChunks } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { embedText, embedBatch, cosineSimilarity, datasetToText, chunkText } from "./embeddings";

export interface RetrievedChunk {
  chunkText: string;
  score: number;
  chunkIndex: number;
}

/**
 * Build / refresh embeddings for a dataset.
 * Called after a dataset is imported or synced.
 */
export async function indexDataset(
  datasetId: string,
  userId: string,
  headers: string[],
  data: Record<string, any>[],
  ragText?: string
): Promise<void> {
  try {
    // Delete old chunks for this dataset
    await db.delete(documentChunks).where(eq(documentChunks.datasetId, datasetId));

    let texts: string[] = [];
    if (ragText && ragText.trim()) {
      texts = chunkText(ragText);
    } else {
      texts = datasetToText(headers, data);
    }
    if (texts.length === 0) return;

    const embeddings = await embedBatch(texts);

    const rows = texts.map((text, i) => ({
      datasetId,
      userId,
      chunkIndex: i,
      chunkText: text,
      embedding: embeddings[i] ?? [],
      tokenCount: Math.ceil(text.length / 4),
    }));

    // Insert in batches of 50
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      await db.insert(documentChunks).values(rows.slice(i, i + BATCH));
    }

    console.log(`RAG: Indexed ${rows.length} chunks for dataset ${datasetId}`);
  } catch (error) {
    // Non-fatal — app works without RAG, just no embedding context
    console.error("RAG indexing error (non-fatal):", error);
  }
}

/**
 * Retrieve top-k most relevant chunks for a query.
 */
export async function retrieveRelevantChunks(
  query: string,
  datasetId: string,
  topK: number = 5,
  userId?: string
): Promise<RetrievedChunk[]> {
  try {
    const queryEmbedding = await embedText(query);
    if (queryEmbedding.length === 0) return [];

    const whereClause = userId
      ? and(eq(documentChunks.datasetId, datasetId), eq(documentChunks.userId, userId))
      : eq(documentChunks.datasetId, datasetId);

    const chunks = await db
      .select()
      .from(documentChunks)
      .where(whereClause);

    if (chunks.length === 0) return [];

    const scored = chunks
      .map(c => ({
        chunkText: c.chunkText,
        chunkIndex: c.chunkIndex,
        score: cosineSimilarity(queryEmbedding, (c.embedding as number[]) ?? []),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.filter(s => s.score > 0.3);
  } catch (error) {
    console.error("RAG retrieval error (non-fatal):", error);
    return [];
  }
}

/**
 * Format retrieved chunks into a context string for AI prompt injection.
 */
export function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks.map((c, i) => `[Context ${i + 1}]:\n${c.chunkText}`).join("\n\n");
}
