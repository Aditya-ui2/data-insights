import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { db } from "../db";
import { knowledgeBaseDocuments, knowledgeBaseChunks } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { chunkText, embedText, embedBatch, cosineSimilarity } from "../embeddings";

export interface ParsedDocument {
  text: string;
  rowCount: number;
}

/**
 * Parse a buffer based on file extension/type.
 */
export async function parseDocument(buffer: Buffer, fileType: string): Promise<ParsedDocument> {
  let text = "";
  let rowCount = 0;

  switch (fileType.toLowerCase()) {
    case "pdf": {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      text = result.text || "";
      rowCount = result.pages.length || 1;
      await parser.destroy();
      break;
    }
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
      rowCount = 1;
      break;
    }
    case "csv":
    case "xlsx":
    case "xls": {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
      rowCount = jsonData.length;
      text = jsonData.map((row, index) => 
        `Row ${index + 1}: ` + Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(" | ")
      ).join("\n");
      break;
    }
    case "txt":
    default: {
      text = buffer.toString("utf-8");
      rowCount = text.split("\n").length;
      break;
    }
  }

  return { text, rowCount };
}

/**
 * Process and index a document in the Knowledge Base.
 */
export async function indexKnowledgeBaseDocument(
  documentId: string,
  userId: string,
  text: string
): Promise<void> {
  try {
    // Call Python FastAPI backend to do chunking, embeddings, and ChromaDB insertion
    const response = await fetch("http://localhost:8000/documents/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, userId, text }),
    });

    if (!response.ok) {
      throw new Error(`Python server error: ${response.statusText}`);
    }
  } catch (error) {
    console.error("[KB Node Service] Error calling Python indexer:", error);
    // Mark as failed in DB
    await db
      .update(knowledgeBaseDocuments)
      .set({ processingStatus: "failed", indexingStatus: "failed" })
      .where(eq(knowledgeBaseDocuments.id, documentId));
    throw error;
  }
}

/**
 * Search the Knowledge Base for chunks matching a query.
 */
export async function retrieveRelevantKbChunks(
  query: string,
  userId: string,
  topK: number = 5
): Promise<{ chunkText: string; score: number; documentName: string }[]> {
  try {
    const queryEmbedding = await embedText(query);
    if (queryEmbedding.length === 0) return [];

    // Fetch all chunks for the user
    const chunks = await db
      .select({
        chunkText: knowledgeBaseChunks.chunkText,
        embedding: knowledgeBaseChunks.embedding,
        fileName: knowledgeBaseDocuments.fileName,
      })
      .from(knowledgeBaseChunks)
      .innerJoin(
        knowledgeBaseDocuments,
        eq(knowledgeBaseChunks.documentId, knowledgeBaseDocuments.id)
      )
      .where(eq(knowledgeBaseChunks.userId, userId));

    if (chunks.length === 0) return [];

    // Calculate similarity score
    const scored = chunks
      .map(c => ({
        chunkText: c.chunkText,
        documentName: c.fileName,
        score: cosineSimilarity(queryEmbedding, (c.embedding as number[]) ?? []),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.filter(s => s.score > 0.25); // filter out low similarity
  } catch (error) {
    console.error("[KB Service] Error retrieving relevant chunks:", error);
    return [];
  }
}
