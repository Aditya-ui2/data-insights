import os
import sys
import socket
from dotenv import load_dotenv

# Monkeypatch socket.getaddrinfo to force IPv4 DNS resolution (resolves IPv6 handshake hangs on macOS)
orig_getaddrinfo = socket.getaddrinfo
def patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    if family == socket.AF_UNSPEC:
        family = socket.AF_INET
    return orig_getaddrinfo(host, port, family, type, proto, flags)
socket.getaddrinfo = patched_getaddrinfo

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

# Add current directory to path and automatically load local venv packages
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
venv_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "venv")
if os.path.exists(venv_dir):
    for root, dirs, files in os.walk(venv_dir):
        if "site-packages" in dirs:
            site_pkg = os.path.join(root, "site-packages")
            if site_pkg not in sys.path:
                sys.path.insert(0, site_pkg)
                break


from db import get_db, KnowledgeBaseDocument
from services.kb_service import (
    index_document, retrieve_relevant_chunks, delete_document_index, parse_document
)
from services.sql_agent import (
    generate_sql_query, execute_safe_query, explain_results
)
from services.agent_workspace import run_agent_analysis_workflow
from services.actions_service import execute_copilot_action
from services.integrations_service import test_integration_connection
from services.analytics_engine import (
    calculate_business_kpis, analyze_revenue_trends, check_revenue_anomalies
)
from google import genai

# Custom analytics imports
from analytics.ingestion.parser import parse_file
from analytics.ingestion.normalizer import normalize_dataset
from analytics.profiling.profiler import profile_dataset
from analytics.schema.schema_detector import classify_dataset_schema
from analytics.dashboard.kpi_discovery import discover_kpis
from analytics.charts.chart_selector import select_charts
from analytics.insights.insight_generator import generate_dashboard_insights
from analytics.chat.chat_agent import execute_chat_query

app = FastAPI(title="Enterprise AI Copilot Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini with a strict timeout to prevent API/network retries from hanging the server
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)

# --- Schemas ---
class ChatRequest(BaseModel):
    question: str
    businessId: Optional[str] = None
    userId: str

class IndexRequest(BaseModel):
    documentId: str
    userId: str
    text: str

class DeleteRequest(BaseModel):
    documentId: str
    userId: str

class AgentRequest(BaseModel):
    businessId: str
    userId: str
    period: str

class ActionRequest(BaseModel):
    actionId: str
    userId: str
    businessId: str

class IntegrationRequest(BaseModel):
    integrationId: str
    userId: str
    incremental: Optional[bool] = False

class WritebackRequest(BaseModel):
    integrationId: str
    userId: str
    entity: str
    recordData: dict

class ScrapeRequest(BaseModel):
    url: str

# --- Endpoints ---

@app.post("/chat")
def chat_copilot(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Executes conversational intelligence: RAG vector search + SQL execution.
    """
    question = req.question
    business_id = req.businessId
    user_id = req.userId

    if not question or not question.strip():
        raise HTTPException(status_code=400, detail="Question is required")

    response_text = ""
    sql_executed = None
    sql_results = None
    kb_used = False
    db_used = False
    citations = []

    # 1. RAG vector search from ChromaDB
    retrieved_chunks = retrieve_relevant_chunks(user_id, question, top_k=3)
    kb_context = ""
    if retrieved_chunks:
        kb_used = True
        formatted_chunks = []
        for c in retrieved_chunks:
            # Query doc name from DB
            doc_id = c["document_id"]
            doc = db.query(KnowledgeBaseDocument).filter(KnowledgeBaseDocument.id == doc_id).first()
            doc_name = doc.fileName if doc else "Document"
            citations.append(doc_name)
            formatted_chunks.append(f"[Document: {doc_name} (Score: {c['score']:.2f})]:\n{c['chunk_text']}")
        kb_context = "\n\n".join(formatted_chunks)

    # 2. Check if DB SQL query is required
    lowercase_q = question.lower()
    keywords = ["revenue", "employee", "sales", "trend", "risk", "opportunity", "growth", "perform", "team", "task", "meeting", "check-in", "salary", "kpi", "anomaly"]
    is_db_question = any(k in lowercase_q for k in keywords)

    sql_explanation = ""
    if is_db_question and business_id:
        try:
            sql_query = generate_sql_query(question, business_id)
            if sql_query:
                sql_executed = sql_query
                db_used = True
                try:
                    rows = execute_safe_query(db, sql_query)
                    sql_results = rows
                    sql_explanation = explain_results(question, sql_query, rows)
                except Exception as query_err:
                    sql_explanation = f"I generated the database query, but was unable to run it: {str(query_err)}"
        except Exception as e:
            print(f"[Main Chat] SQL Agent failed: {e}")

    # Remove duplicates from citations list
    citations = list(set(citations))

    # 3. Synthesize final answer using Gemini
    if not client:
        # Fallback if no LLM API Key is set
        response_text = "API Key not configured. Results: \n"
        if sql_explanation:
            response_text += f"\nDatabase analysis: {sql_explanation}"
        if kb_context:
            response_text += f"\nKnowledge base: {kb_context}"
    else:
        try:
            if db_used and kb_used:
                synthesis_prompt = f"""
You are a helpful Enterprise AI Copilot. A database agent analyzed the business data and found:
{sql_explanation}

Additionally, matching Knowledge Base documents suggest:
{kb_context}

USER QUESTION: "{question}"

Synthesize these two sources into a unified, clean answer for the user. Do not repeat facts.
Cite the relevant document names in your text when referencing facts from the knowledge base.
"""
                res = client.models.generate_content(
                    model=os.environ.get("GEMINI_PARSE_MODEL", "gemini-2.5-flash"),
                    contents=synthesis_prompt
                )
                response_text = res.text or "Unable to synthesize answer."
            elif db_used:
                response_text = sql_explanation
            elif kb_used:
                synthesis_prompt = f"""
You are a helpful Enterprise AI Copilot. Use the following context documents to answer the user's question.
If the documents do not contain the answer, provide general best practice advice.

KNOWLEDGE BASE DOCUMENTS:
{kb_context}

USER QUESTION: "{question}"

Provide a clear, natural response. Cite the document names when referencing knowledge base facts.
"""
                res = client.models.generate_content(
                    model=os.environ.get("GEMINI_PARSE_MODEL", "gemini-2.5-flash"),
                    contents=synthesis_prompt
                )
                response_text = res.text or "Unable to synthesize answer."
            else:
                # General conversation
                res = client.models.generate_content(
                    model=os.environ.get("GEMINI_PARSE_MODEL", "gemini-2.5-flash"),
                    contents=f"You are a helpful Enterprise AI Copilot. Answer this question: {question}"
                )
                response_text = res.text or "Unable to answer."
        except Exception as synthesis_err:
            response_text = sql_explanation or kb_context or f"Error compiling response: {str(synthesis_err)}"

    return {
        "response": response_text,
        "sqlQuery": sql_executed,
        "sqlResults": sql_results,
        "kbUsed": kb_used,
        "dbUsed": db_used,
        "citations": citations
    }

@app.post("/documents/index")
def index_document_endpoint(req: IndexRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Triggers document indexing in a background task.
    """
    background_tasks.add_task(index_document, db, req.documentId, req.userId, req.text)
    return {"success": True, "message": "Indexing has started in the background."}

@app.post("/documents/delete")
def delete_document_endpoint(req: DeleteRequest):
    """
    Removes document indexing from vector database.
    """
    delete_document_index(req.documentId, req.userId)
    return {"success": True}

@app.post("/agents/analyze")
def run_agents_analysis(req: AgentRequest, db: Session = Depends(get_db)):
    """
    Runs the multi-agent consensus workflow using LangGraph.
    """
    results = run_agent_analysis_workflow(db, req.businessId, req.userId, req.period)
    return results

@app.post("/actions/execute")
def execute_action(req: ActionRequest, db: Session = Depends(get_db)):
    """
    Executes an action, modifying business tasks/schedules.
    """
    results = execute_copilot_action(db, req.actionId, req.userId, req.businessId)
    return results

@app.post("/integrations/test")
def test_integration(req: IntegrationRequest, db: Session = Depends(get_db)):
    """
    Tests connections of external sources.
    """
    results = test_integration_connection(db, req.integrationId, req.userId)
    return results

@app.post("/integrations/sync")
def sync_integration(req: IntegrationRequest, db: Session = Depends(get_db)):
    """
    Triggers fetching, dynamic metadata discovery, and canonical mapping of the data using Enterprise Connector SDK.
    """
    from db import Integration
    from sqlalchemy import and_
    import polars as pl
    from datetime import datetime
    
    integration = db.query(Integration).filter(
        and_(Integration.id == req.integrationId, Integration.userId == req.userId)
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    source_type = integration.sourceType.lower()
    config = integration.config or {}
    config["integrationId"] = integration.id
    
    # Setup incremental watermark if requested
    if req.incremental and integration.lastSyncedAt:
        config["watermark"] = integration.lastSyncedAt.isoformat()
        
    try:
        from connectors.registry import get_connector
        connector = get_connector(source_type, config)
        connector.client = client # Inject GenAI client for custom field classification
        
        # 1. Execute Dynamic Sync
        res = connector.sync_data()
        entities = res.get("entities", {})
        metadata = res.get("metadata", {})
        
        # 2. Extract and classify custom fields dynamically at runtime
        all_custom_fields = []
        for obj_name, fields_info in metadata.items():
            all_custom_fields.extend(fields_info.get("custom", []))
            
        custom_classifications = {}
        if all_custom_fields:
            # Call AI classifier for new taxonomy mappings
            custom_classifications = connector.classify_custom_fields(all_custom_fields)
            
        # Validate canonical records
        from connectors.canonical import validate_canonical_data
        validated_entities = {}
        for entity_name, records in list(entities.items()):
            validated_entities[entity_name] = validate_canonical_data(entity_name, records)
            
        # 3. Store datasets and schemas on disk
        dataset_id = f"conn_{req.integrationId}"
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        os.makedirs(data_dir, exist_ok=True)
        
        import json
        # Save canonical mapped data
        json_path = os.path.join(data_dir, f"{dataset_id}.connector.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(validated_entities, f, indent=2, ensure_ascii=False)
            
        # Save custom schema details (Company-specific metadata schema)
        schema_path = os.path.join(data_dir, f"{req.integrationId}.schema.json")
        with open(schema_path, "w", encoding="utf-8") as f:
            json.dump({
                "metadata": metadata,
                "customClassifications": custom_classifications,
                "syncedAt": datetime.utcnow().isoformat()
            }, f, indent=2, ensure_ascii=False)
            
        # Create a simple parquet representation of the primary entity so that
        # standard file checking does not error out on missing files.
        primary_entity = "orders" if "orders" in validated_entities else ("payments" if "payments" in validated_entities else ("revenue" if "revenue" in validated_entities else list(validated_entities.keys())[0]))
        primary_records = validated_entities[primary_entity]
        
        parquet_path = os.path.join(data_dir, f"{dataset_id}.parquet")
        if primary_records:
            df = pl.DataFrame(primary_records)
        else:
            df = pl.DataFrame([{"id": "placeholder", "total_amount": 0.0, "created_at": datetime.utcnow().isoformat()}])
        df.write_parquet(parquet_path)
        
        # Save integration status
        integration.connectionStatus = "connected"
        integration.connectionHealth = "healthy"
        integration.syncStatus = "synced"
        integration.lastSyncedAt = datetime.utcnow()
        integration.updatedAt = datetime.utcnow()
        db.commit()
        
        headers = df.columns
        return {
            "success": True,
            "datasetId": dataset_id,
            "headers": headers,
            "rowCount": len(df),
            "primaryEntity": primary_entity,
            "message": "Data synchronized and canonicalized successfully with Enterprise SDK."
        }
    except Exception as e:
        integration.syncStatus = "failed"
        integration.updatedAt = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@app.post("/integrations/writeback")
def writeback_integration(req: WritebackRequest, db: Session = Depends(get_db)):
    """
    Executes bidirectional writeback of sheet cells update to external source.
    """
    from db import Integration
    from sqlalchemy import and_
    
    integration = db.query(Integration).filter(
        and_(Integration.id == req.integrationId, Integration.userId == req.userId)
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
        
    source_type = integration.sourceType.lower()
    config = integration.config or {}
    config["integrationId"] = integration.id
    
    try:
        from connectors.registry import get_connector
        connector = get_connector(source_type, config)
        res = connector.writeBack(req.entity, req.recordData)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Writeback execution failed: {str(e)}")

@app.post("/integrations/scrape")
def scrape_integration_page(req: ScrapeRequest):
    """
    Scrapes external web pages using Gemini AI visual extraction.
    """
    from services.scraper import scrape_web_page
    return scrape_web_page(req.url)

@app.get("/analytics/kpis")
def get_analytics_kpis(businessId: str, db: Session = Depends(get_db)):
    """
    Provides real time analytical data calculations.
    """
    if not businessId:
        raise HTTPException(status_code=400, detail="businessId is required")
        
    kpis = calculate_business_kpis(db, businessId)
    trends = analyze_revenue_trends(db, businessId)
    anomalies = check_revenue_anomalies(db, businessId)
    
    return {
        "kpis": kpis,
        "trends": trends,
        "anomalies": anomalies
    }

class DashboardGenerateRequest(BaseModel):
    datasetId: str
    spreadsheetName: str
    userId: str

class ChatRequestSchema(BaseModel):
    question: str
    datasetId: str
    userId: str
    conversationHistory: List[Dict[str, str]] = []

@app.post("/parse-document")
def parse_document_endpoint(
    file: UploadFile = File(...),
    userId: str = Form(...),
    documentId: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    Receives any supported file format, parses it into normalized structured data,
    profiles it, writes it to a Parquet file for fast querying, and indexes it into Chroma DB.
    """
    file_bytes = file.file.read()
    file_type = file.filename.split(".")[-1].lower() if file.filename else "txt"
    
    # 1. Parse and classify file using UDIE (Modules 1 - 7)
    from analytics.udie import UniversalDataIntelligenceEngine
    udie = UniversalDataIntelligenceEngine(client)
    
    from analytics.udie.dataframe_integrity import DataFrameIntegrityException
    try:
        res = udie.parse_uploaded_file(file_bytes, file.filename)
    except DataFrameIntegrityException as die:
        raise HTTPException(status_code=400, detail={
            "message": "DataFrame Integrity check failed",
            "score": die.score,
            "failedStage": die.failed_stage,
            "affectedColumns": die.affected_columns,
            "details": die.reason,
            "suggestedFix": die.suggested_fix
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"UDIE failed to classify/parse upload: {str(e)}")
        
    cleaned_headers = res["headers"]
    cleaned_rows = res["rows"]
    column_types = res["columnTypes"]
    file_type = res["fileType"]
    rag_text = res["ragText"]
    validation = res["validation"]
    
    if not cleaned_rows:
        raise HTTPException(status_code=400, detail="The uploaded file contains no readable tables or data.")
        
    # 2. Save dataset as columnar Parquet file
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    os.makedirs(data_dir, exist_ok=True)
    parquet_path = os.path.join(data_dir, f"{documentId}.parquet")
    
    import polars as pl
    import pandas as pd
    import numpy as np
    try:
        df_pd = pd.DataFrame(cleaned_rows)
        for col in df_pd.columns:
            col_type = column_types.get(col, "text")
            if col_type == "numeric":
                df_pd[col] = pd.to_numeric(df_pd[col].replace('', np.nan).replace(',', '', regex=True), errors='coerce')
            else:
                df_pd[col] = df_pd[col].fillna('').astype(str).replace('nan', '').replace('None', '')
        df_pl = pl.from_pandas(df_pd)
        df_pl.write_parquet(parquet_path)
        
        # Save side metadata JSON file for pre-existing BI total cards and column semantic classifications
        metadata_path = os.path.join(data_dir, f"{documentId}.metadata.json")
        with open(metadata_path, "w", encoding="utf-8") as f:
            import json
            json.dump({
                "detectedCards": res.get("detectedCards", []),
                "classifications": res.get("classifications", {}),
                "relevanceScores": res.get("relevanceScores", {}),
                "columnTypes": column_types,
                "canonicalMapping": res.get("canonicalMapping", {}),
                "pendingMappings": res.get("pendingMappings", [])
            }, f, indent=2)
    except Exception as e:
        print(f"[Parse Endpoint] Writing Parquet / Metadata failed: {e}", flush=True)
        
    # 3. Generate data profiling report (Module 4)
    from analytics.profiling.profiler import profile_dataset
    profiling_stats = profile_dataset(cleaned_rows, column_types)
    
    # 4. Background task for RAG (unstructured text retrieval fallback)
    text_content = ""
    if file_type == "pdf" and rag_text.strip():
        text_content = rag_text
    else:
        text_content = "\n".join([", ".join([f"{k}:{v}" for k, v in r.items()]) for r in cleaned_rows[:500]])
        
    if text_content.strip():
        background_tasks.add_task(index_document, db, documentId, userId, text_content)
        
    from analytics.profiling.profiler import sanitize_float_values
    response_data = {
        "headers": cleaned_headers,
        "rows": cleaned_rows[:1000],  # Return up to 1000 rows as preview to Node
        "rowCount": len(cleaned_rows),
        "fileType": file_type,
        "profilingStats": profiling_stats,
        "columnTypes": column_types,
        "ragText": rag_text,
        "validation": validation,
        "classifications": res.get("classifications", {}),
        "relevanceScores": res.get("relevanceScores", {}),
        "canonicalMapping": res.get("canonicalMapping", {}),
        "pendingMappings": res.get("pendingMappings", []),
    }
    return sanitize_float_values(response_data)


class SheetDataPayload(BaseModel):
    sheetName: str
    grid: List[List[Any]]
    documentId: Optional[str] = None

@app.post("/parse-sheet-data")
def parse_sheet_data_endpoint(
    payload: SheetDataPayload,
    db: Session = Depends(get_db)
):
    """
    Receives raw list of lists grid from Google Sheets API,
    applies the dynamic start-row detection and UDIE normalization.
    """
    from analytics.udie import UniversalDataIntelligenceEngine
    from analytics.udie.dataframe_integrity import DataFrameIntegrityException
    
    udie = UniversalDataIntelligenceEngine(client)
    
    try:
        res = udie.parse_raw_grid_data(payload.grid, payload.sheetName)
    except DataFrameIntegrityException as die:
        raise HTTPException(status_code=400, detail={
            "message": "DataFrame Integrity check failed",
            "score": die.score,
            "failedStage": die.failed_stage,
            "affectedColumns": die.affected_columns,
            "details": die.reason,
            "suggestedFix": die.suggested_fix
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"UDIE failed to classify/parse sheet grid: {str(e)}")
        
    cleaned_headers = res["headers"]
    cleaned_rows = res["rows"]
    column_types = res["columnTypes"]
    file_type = res["fileType"]
    rag_text = res["ragText"]
    validation = res["validation"]
    
    if not cleaned_rows:
        raise HTTPException(status_code=400, detail="The sheet grid contains no readable tables or data.")
    
    # Save parquet if documentId is provided (so dashboard generation can find it)
    if payload.documentId:
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        os.makedirs(data_dir, exist_ok=True)
        parquet_path = os.path.join(data_dir, f"{payload.documentId}.parquet")
        import polars as pl
        import pandas as pd
        import numpy as np
        try:
            df_pd = pd.DataFrame(cleaned_rows)
            for col in df_pd.columns:
                col_type = column_types.get(col, "text")
                if col_type == "numeric":
                    df_pd[col] = pd.to_numeric(df_pd[col].replace('', np.nan).replace(',', '', regex=True), errors='coerce')
                else:
                    df_pd[col] = df_pd[col].fillna('').astype(str).replace('nan', '').replace('None', '')
            pl.from_pandas(df_pd).write_parquet(parquet_path)
            metadata_path = os.path.join(data_dir, f"{payload.documentId}.metadata.json")
            with open(metadata_path, "w", encoding="utf-8") as f:
                import json
                json.dump({
                    "detectedCards": res.get("detectedCards", []),
                    "classifications": res.get("classifications", {}),
                    "relevanceScores": res.get("relevanceScores", {}),
                    "columnTypes": column_types,
                    "canonicalMapping": res.get("canonicalMapping", {}),
                    "pendingMappings": res.get("pendingMappings", [])
                }, f, indent=2)
        except Exception as e:
            print(f"[Sheet Parse] Failed to save parquet: {e}", flush=True)
        
    # Generate profiling stats (same as parse-document)
    from analytics.profiling.profiler import profile_dataset
    profiling_stats = profile_dataset(cleaned_rows, column_types)
    
    from analytics.profiling.profiler import sanitize_float_values
    response_data = {
        "headers": cleaned_headers,
        "rows": cleaned_rows[:1000],  # Return preview
        "rowCount": len(cleaned_rows),
        "fileType": file_type,
        "profilingStats": profiling_stats,
        "columnTypes": column_types,
        "ragText": rag_text,
        "validation": validation,
        "classifications": res.get("classifications", {}),
        "relevanceScores": res.get("relevanceScores", {}),
        "pdfInfo": res.get("pdfInfo", {}),
        "canonicalMapping": res.get("canonicalMapping", {}),
        "pendingMappings": res.get("pendingMappings", []),
    }
    return sanitize_float_values(response_data)


@app.post("/api/analytics/generate-dashboard")
def generate_dashboard_endpoint(req: DashboardGenerateRequest):
    """
    Generates a deterministic dashboard configuration (KPIs + charts + outliers + insights).
    """
    print("[ENDPOINT] Entering generate_dashboard_endpoint...", flush=True)
    import polars as pl
    from analytics.profiling.profiler import profile_dataset
    from analytics.schema.schema_detector import classify_dataset_schema
    from analytics.dashboard.kpi_discovery import discover_kpis
    from analytics.charts.chart_selector import select_charts
    from analytics.insights.insight_generator import generate_dashboard_insights
    from datetime import datetime
    from analytics.udie.dataframe_integrity import DataFrameIntegrityException
    
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    parquet_path = os.path.join(data_dir, f"{req.datasetId}.parquet")
    connector_json_path = os.path.join(data_dir, f"{req.datasetId}.connector.json")
    print(f"[ENDPOINT] datasetId={req.datasetId}, path={parquet_path}, connector_path={connector_json_path}", flush=True)
    
    if not os.path.exists(parquet_path) and not os.path.exists(connector_json_path):
        print(f"[ENDPOINT] Dataset files not found on disk.", flush=True)
        raise HTTPException(status_code=404, detail="Dataset file not found on disk.")
        
    try:
        from analytics.profiling.profiler import sanitize_float_values
        
        # Check if synced connector data
        if os.path.exists(connector_json_path):
            print("[ENDPOINT] Synced connector detected. Loading from JSON...", flush=True)
            import json
            with open(connector_json_path, "r", encoding="utf-8") as f:
                entities_data = json.load(f)
                
            from connectors.canonical_engine import CanonicalAnalyticsEngine
            engine = CanonicalAnalyticsEngine(client)
            print("[ENDPOINT] Generating dashboard config via Canonical Engine...", flush=True)
            dashboard_config = engine.generate_dashboard_config(
                entities_data=entities_data,
                spreadsheet_name=req.spreadsheetName
            )
            dashboard_config["generatedAt"] = datetime.utcnow().isoformat()
            print("[ENDPOINT] Canonical Engine generation complete.", flush=True)
            return sanitize_float_values(dashboard_config)

        # Load from parquet (Standard fallback / AI Import Mode)
        print("[ENDPOINT] Reading parquet...", flush=True)
        df_pl = pl.read_parquet(parquet_path)
        cleaned_rows = df_pl.to_dicts()
        cleaned_headers = df_pl.columns
        print(f"[ENDPOINT] Parquet read. Headers={len(cleaned_headers)}, Rows={len(cleaned_rows)}", flush=True)
        
        # Call UDIE (Modules 8 - 12)
        from analytics.udie import UniversalDataIntelligenceEngine
        udie = UniversalDataIntelligenceEngine(client)
        
        print("[ENDPOINT] Generating dashboard config via UDIE...", flush=True)
        dashboard_config = udie.generate_dashboard_config(
            rows=cleaned_rows,
            headers=cleaned_headers,
            spreadsheet_name=req.spreadsheetName,
            document_id=req.datasetId
        )
        dashboard_config["generatedAt"] = datetime.utcnow().isoformat()
        print("[ENDPOINT] UDIE generation complete.", flush=True)
        
        from analytics.profiling.profiler import sanitize_float_values
        return sanitize_float_values(dashboard_config)
        
    except DataFrameIntegrityException as die:
        raise HTTPException(status_code=400, detail={
            "message": "DataFrame Integrity check failed",
            "score": die.score,
            "failedStage": die.failed_stage,
            "affectedColumns": die.affected_columns,
            "details": die.reason,
            "suggestedFix": die.suggested_fix
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {str(e)}")

# Schema cache: {dataset_id: (schema_desc, timestamp)}
_schema_cache = {}
_SCHEMA_CACHE_TTL = int(os.environ.get("SCHEMA_CACHE_TTL", "300"))

@app.get("/api/analytics/token-usage")
def get_token_usage():
    from analytics.utils.llm_client import get_token_usage as _get_token_usage
    return _get_token_usage()

@app.post("/api/analytics/chat")
def chat_analytics_endpoint(req: ChatRequestSchema):
    """
    Executes conversational analytics chat using natural language to DuckDB SQL.
    """
    import polars as pl
    from analytics.chat.chat_agent import execute_chat_query
    
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    parquet_path = os.path.join(data_dir, f"{req.datasetId}.parquet")
    
    if not os.path.exists(parquet_path):
        raise HTTPException(status_code=404, detail="Dataset Parquet file not found.")

    import time as time_module
    now = time_module.time()
    cached = _schema_cache.get(req.datasetId)

    _NUMERIC_SAMPLE = int(os.environ.get("NUMERIC_SAMPLE", "200"))
    _NUMERIC_RATIO = float(os.environ.get("NUMERIC_RATIO", "0.5"))
    _CATEGORY_RATIO = float(os.environ.get("CATEGORY_RATIO", "0.2"))
    _DATE_FORMATS = os.environ.get("DATE_FORMATS", "%m/%d/%Y %H:%M:%S,%d-%m-%Y,%Y-%m-%d,%m/%d/%Y,%d/%m/%Y,%Y/%m/%d").split(",")
    _CURRENCY_SYMBOLS = os.environ.get("CURRENCY_SYMBOLS", "₹,$").split(",")

    if cached and (now - cached[1]) < _SCHEMA_CACHE_TTL:
        schema_desc = cached[0]
        df_pl = pl.read_parquet(parquet_path)
        # Still apply type conversions so DuckDB can use EXTRACT etc.
        for col in df_pl.columns:
            if df_pl[col].dtype != pl.Utf8:
                continue
            vals = df_pl[col].to_list()
            non_empty = [v for v in vals if v not in (None, '', 'nan', 'None')]
            if not non_empty:
                continue
            sample = non_empty[0]
            for fmt in _DATE_FORMATS:
                try:
                    pl.Series([sample]).str.to_datetime(format=fmt)
                    df_pl = df_pl.with_columns(pl.col(col).str.to_datetime(format=fmt, strict=False).alias(col))
                    break
                except:
                    continue
            numeric_count = 0
            for v in non_empty[:_NUMERIC_SAMPLE]:
                try:
                    cleaned = str(v)
                    for sym in _CURRENCY_SYMBOLS:
                        cleaned = cleaned.replace(sym, '')
                    float(cleaned.replace(',', '').strip())
                    numeric_count += 1
                except (ValueError, TypeError):
                    pass
            if numeric_count / len(non_empty) > _NUMERIC_RATIO:
                cleaned = df_pl[col].str.replace_all(',', '')
                for sym in _CURRENCY_SYMBOLS:
                    cleaned = cleaned.str.replace(sym, '')
                cleaned = cleaned.str.strip_chars()
                df_pl = df_pl.with_columns(cleaned.cast(pl.Float64, strict=False).alias(col))
    else:
        df_pl = pl.read_parquet(parquet_path)

        for col in df_pl.columns:
            if df_pl[col].dtype != pl.Utf8:
                continue
            vals = df_pl[col].to_list()
            non_empty = [v for v in vals if v not in (None, '', 'nan', 'None')]
            if not non_empty:
                continue
            sample = non_empty[0]
            parsed = False
            for fmt in _DATE_FORMATS:
                try:
                    pl.Series([sample]).str.to_datetime(format=fmt)
                    df_pl = df_pl.with_columns(pl.col(col).str.to_datetime(format=fmt, strict=False).alias(col))
                    parsed = True
                    break
                except:
                    continue
            if parsed:
                continue
            numeric_count = 0
            for v in non_empty[:_NUMERIC_SAMPLE]:
                try:
                    cleaned = str(v)
                    for sym in _CURRENCY_SYMBOLS:
                        cleaned = cleaned.replace(sym, '')
                    float(cleaned.replace(',', '').strip())
                    numeric_count += 1
                except (ValueError, TypeError):
                    pass
            if numeric_count / len(non_empty) > _NUMERIC_RATIO:
                cleaned = df_pl[col].str.replace_all(',', '')
                for sym in _CURRENCY_SYMBOLS:
                    cleaned = cleaned.str.replace(sym, '')
                cleaned = cleaned.str.strip_chars()
                df_pl = df_pl.with_columns(cleaned.cast(pl.Float64, strict=False).alias(col))

        cleaned_headers = df_pl.columns
        column_types = {}
        for col in cleaned_headers:
            dtype = str(df_pl[col].dtype).lower()
            col_lower = col.lower()
            if "int" in dtype or "float" in dtype or "decimal" in dtype:
                column_types[col] = "numeric"
            elif "date" in dtype or "time" in dtype:
                column_types[col] = "date"
            else:
                unique_c = df_pl[col].n_unique()
                total_c = len(df_pl)
                if unique_c / total_c < _CATEGORY_RATIO and total_c > 5:
                    column_types[col] = "category"
                else:
                    column_types[col] = "text"

        schema_map = {}
        _METRIC_KEYWORDS = os.environ.get("SCHEMA_METRIC_KEYWORDS", "amount,revenue,sales,price,profit,expense,cost").split(",")
        _ENTITY_KEYWORDS = os.environ.get("SCHEMA_ENTITY_KEYWORDS", "customer,client,buyer,user,member,name").split(",")
        _TIME_KEYWORDS = os.environ.get("SCHEMA_TIME_KEYWORDS", "date,time,timestamp,created").split(",")
        for col in cleaned_headers:
            col_lower = col.lower()
            if any(k in col_lower for k in _METRIC_KEYWORDS):
                schema_map[col] = "revenue_metric"
            elif any(k in col_lower for k in _ENTITY_KEYWORDS):
                schema_map[col] = "customer_dimension"
            elif any(k in col_lower for k in _TIME_KEYWORDS):
                schema_map[col] = "time_dimension"
            else:
                schema_map[col] = "category_dimension"

        _SCHEMA_NOISE_NULL_RATIO = float(os.environ.get("SCHEMA_NOISE_NULL_RATIO", "0.8"))
        _SCHEMA_NOISE_UNIQUE_MIN = int(os.environ.get("SCHEMA_NOISE_UNIQUE_MIN", "10"))
        _SCHEMA_NOISE_UNIQUE_COUNT = int(os.environ.get("SCHEMA_NOISE_UNIQUE_COUNT", "20"))

        _SCHEMA_SAMPLES = int(os.environ.get("SCHEMA_SAMPLES", "12"))
        schema_desc_lines = []
        total_rows = len(df_pl)
        for col in cleaned_headers:
            non_null = df_pl[col].drop_nulls()
            null_ratio = 1 - (len(non_null) / total_rows) if total_rows > 0 else 1
            unique_count = non_null.n_unique() if len(non_null) > 0 else 0
            is_noise = null_ratio > _SCHEMA_NOISE_NULL_RATIO or (unique_count == len(non_null) > _SCHEMA_NOISE_UNIQUE_MIN and unique_count > _SCHEMA_NOISE_UNIQUE_COUNT)
            if is_noise:
                continue
            c_type = column_types.get(col, "text")
            vals = non_null.unique().head(_SCHEMA_SAMPLES).to_list()
            top_vals = [str(v) for v in vals if v not in (None, '', 'nan', 'None')]
            top_str = ", ".join(top_vals)
            hint = " [date]" if c_type == "date" else ""
            schema_desc_lines.append(f"- {col}:{c_type}({top_str}){hint}")
        schema_desc = "\n".join(schema_desc_lines)
        _schema_cache[req.datasetId] = (schema_desc, now)

    # Write cleaned dataframe to temp parquet for DuckDB
    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix='.parquet', delete=False)
    df_pl.write_parquet(tmp.name)
    tmp.close()

    try:
        # Build conversation context from history (last 4 messages only to limit tokens)
        chat_context = ""
        for msg in (req.conversationHistory or [])[-4:]:
            role = "User" if msg.get("role") == "user" else "Assistant"
            chat_context += f"{role}: {msg.get('content', '')}\n"

        result = execute_chat_query(
            question=req.question,
            parquet_path=tmp.name,
            schema_desc=schema_desc,
            chat_context=chat_context,
            client=client
        )
        os.unlink(tmp.name)  # clean up
        
        from analytics.profiling.profiler import sanitize_float_values
        return sanitize_float_values(result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat query execution failed: {str(e)}")


# --- Business Dictionary Endpoints ---

class ConfirmMappingRequest(BaseModel):
    rawColumn: str
    canonicalKey: str
    documentId: str

class BulkConfirmMappingsRequest(BaseModel):
    mappings: List[ConfirmMappingRequest]

@app.post("/api/dictionary/confirm-mapping")
def confirm_column_mapping(req: ConfirmMappingRequest):
    from analytics.business_dictionary import BusinessDictionary, ColumnMatcher
    dictionary = BusinessDictionary()
    matcher = ColumnMatcher(dictionary)
    match = matcher.confirm_mapping(req.rawColumn, req.canonicalKey, save_alias=True)
    if not match:
        raise HTTPException(status_code=400, detail=f"Failed to confirm mapping for '{req.rawColumn}' → '{req.canonicalKey}'")
    return {"status": "saved", "mapping": match.to_dict()}

@app.post("/api/dictionary/bulk-confirm-mappings")
def bulk_confirm_mappings(req: BulkConfirmMappingsRequest):
    from analytics.business_dictionary import BusinessDictionary, ColumnMatcher
    dictionary = BusinessDictionary()
    matcher = ColumnMatcher(dictionary)
    results = []
    for m in req.mappings:
        match = matcher.confirm_mapping(m.rawColumn, m.canonicalKey, save_alias=True)
        if match:
            results.append(match.to_dict())
    dictionary.save()
    return {"status": "saved", "count": len(results), "mappings": results}

@app.get("/api/dictionary/fields")
def get_dictionary_fields():
    from analytics.business_dictionary import BusinessDictionary
    dictionary = BusinessDictionary()
    fields = dictionary.get_all_fields()
    result = []
    for key, field in fields.items():
        result.append({
            "key": key,
            "canonical_name": field["canonical_name"],
            "category": field.get("category", "Unknown"),
            "description": field.get("description", ""),
            "aliases": field.get("aliases", []),
            "dashboard_priority": field.get("dashboard_priority", 0),
        })
    return {"fields": result, "total": len(result)}

@app.post("/api/dictionary/reload")
def reload_dictionary():
    from analytics.business_dictionary import BusinessDictionary
    dictionary = BusinessDictionary()
    dictionary.reload()
    return {"status": "reloaded", "total_fields": len(dictionary.get_all_fields())}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=["backend"])

