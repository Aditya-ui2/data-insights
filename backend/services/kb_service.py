import os
import io
import re
import pandas as pd
from datetime import datetime
import pypdf
import docx2txt
import chromadb
from google import genai
from sqlalchemy.orm import Session
from db import KnowledgeBaseDocument, KnowledgeBaseChunk

# Initialize Gemini Client
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)

# Initialize ChromaDB Client
# Use an absolute path inside backend to store Chroma DB persistent files
CHROMA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_db")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_or_create_collection(name="kb_chunks")

def parse_document(file_bytes: bytes, file_type: str) -> tuple[str, int]:
    """
    Parses document bytes into a plain text string and returns row/page count.
    """
    text = ""
    row_count = 0
    file_type = file_type.lower().strip(".")

    if file_type == "pdf":
        pdf_file = io.BytesIO(file_bytes)
        reader = pypdf.PdfReader(pdf_file)
        row_count = len(reader.pages)
        pages_text = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                pages_text.append(page_text)
        text = "\n".join(pages_text)
    elif file_type == "docx":
        docx_file = io.BytesIO(file_bytes)
        # docx2txt takes file-like object or path
        text = docx2txt.process(docx_file)
        row_count = 1
    elif file_type in ["csv", "xlsx", "xls"]:
        df = None
        if file_type == "csv":
            df = pd.read_csv(io.BytesIO(file_bytes))
        else:
            df = pd.read_excel(io.BytesIO(file_bytes))
        
        row_count = len(df)
        rows_text = []
        headers = [str(c) for c in df.columns]
        rows_text.append(f"Headers: {', '.join(headers)}")
        for idx, row in df.iterrows():
            row_vals = [f"{col}: {val}" for col, val in row.items() if pd.notna(val)]
            rows_text.append(f"Row {idx+1}: " + " | ".join(row_vals))
        text = "\n".join(rows_text)
    else:  # txt and fallback
        text = file_bytes.decode("utf-8", errors="ignore")
        row_count = len(text.splitlines())
    
    return text, row_count

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Splits text into chunks of clean word sizes with specified overlap.
    """
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i:i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap
    return [c for c in chunks if len(c.strip()) > 10]

def embed_text_batch(texts: list[str]) -> list[list[float]]:
    """
    Generates embeddings in batch using the Gemini API.
    """
    if not client:
        # Fallback to zero vectors if API key is not configured
        return [[0.0] * 768 for _ in texts]
    
    try:
        # Batch call model 'text-embedding-004'
        response = client.models.embed_content(
            model="text-embedding-004",
            contents=texts
        )
        return [e.values for e in response.embeddings]
    except Exception as e:
        print(f"[KB Service] Embedding error: {e}")
        # Return fallback zero vectors
        return [[0.0] * 768 for _ in texts]

def embed_text(text: str) -> list[float]:
    """
    Generates a single text embedding.
    """
    embeddings = embed_text_batch([text])
    return embeddings[0]

def index_document(db: Session, doc_id: str, user_id: str, text: str) -> None:
    """
    Takes document text, chunks it, embeds it, and indexes it in both PostgreSQL and ChromaDB.
    """
    try:
        # 1. Update status to processing
        doc = db.query(KnowledgeBaseDocument).filter(
            KnowledgeBaseDocument.id == doc_id, 
            KnowledgeBaseDocument.userId == user_id
        ).first()
        if not doc:
            print(f"[KB Service] Document {doc_id} not found.")
            return

        doc.processingStatus = "processing"
        doc.indexingStatus = "pending"
        db.commit()

        # 2. Chunk text
        chunks = chunk_text(text)
        if not chunks:
            doc.processingStatus = "completed"
            doc.indexingStatus = "completed"
            db.commit()
            return

        # 3. Update status to indexing
        doc.indexingStatus = "indexing"
        db.commit()

        # 4. Generate embeddings in batches of 20 (to avoid payload/rate limits)
        embeddings = []
        batch_size = 20
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            embeddings.extend(embed_text_batch(batch))

        # 5. Insert chunks to Postgres
        postgres_chunks = []
        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            chunk_obj = KnowledgeBaseChunk(
                id=f"{doc_id}_{idx}",
                documentId=doc_id,
                userId=user_id,
                chunkIndex=idx,
                chunkText=chunk,
                embedding=emb
            )
            postgres_chunks.append(chunk_obj)
        
        # Batch insert chunks
        db.bulk_save_objects(postgres_chunks)
        db.commit()

        # 6. Index in ChromaDB
        chroma_ids = [f"{doc_id}_{idx}" for idx in range(len(chunks))]
        chroma_metadatas = [{"user_id": user_id, "document_id": doc_id} for _ in range(len(chunks))]
        
        # Add to Chroma collection
        collection.add(
            ids=chroma_ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=chroma_metadatas
        )

        # 7. Complete processing
        doc.processingStatus = "completed"
        doc.indexingStatus = "completed"
        db.commit()
        print(f"[KB Service] Document {doc_id} indexed successfully with {len(chunks)} chunks.")

    except Exception as e:
        print(f"[KB Service] Ingestion failed for document {doc_id}: {e}")
        doc = db.query(KnowledgeBaseDocument).filter(
            KnowledgeBaseDocument.id == doc_id
        ).first()
        if doc:
            doc.processingStatus = "failed"
            doc.indexingStatus = "failed"
            db.commit()
        raise e

def retrieve_relevant_chunks(user_id: str, query: str, top_k: int = 5) -> list[dict]:
    """
    Queries ChromaDB to find relevant document chunks for a query.
    """
    try:
        query_emb = embed_text(query)
        
        results = collection.query(
            query_embeddings=[query_emb],
            n_results=top_k,
            where={"user_id": user_id}
        )

        retrieved = []
        if results and "documents" in results and results["documents"]:
            docs = results["documents"][0]
            ids = results["ids"][0]
            metadatas = results["metadatas"][0]
            distances = results["distances"][0] if "distances" in results else [0.0] * len(docs)

            for d, i, m, dist in zip(docs, ids, metadatas, distances):
                # distance to similarity score conversion (Chroma L2 distance default)
                # similarity = 1 / (1 + distance) or cosine similarity conversion
                score = 1.0 - dist if dist <= 1.0 else 0.0
                retrieved.append({
                    "chunk_text": d,
                    "document_id": m["document_id"],
                    "score": score
                })
        
        # Filter low similarity results
        return [r for r in retrieved if r["score"] > 0.25]
    except Exception as e:
        print(f"[KB Service] Query failed: {e}")
        return []

def delete_document_index(doc_id: str, user_id: str) -> None:
    """
    Deletes a document's chunks from ChromaDB.
    """
    try:
        # Delete from ChromaDB
        collection.delete(
            where={"document_id": doc_id, "user_id": user_id}
        )
        print(f"[KB Service] Document {doc_id} removed from ChromaDB.")
    except Exception as e:
        print(f"[KB Service] Error deleting from ChromaDB: {e}")
