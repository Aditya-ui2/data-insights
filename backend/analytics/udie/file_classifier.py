import os
import re
from typing import Dict, Any, Tuple

def classify_file(file_bytes: bytes, filename: str) -> Tuple[str, Dict[str, Any]]:
    """
    Module 1: Universal File Classifier.
    Analyzes bytes and extension to output a precise classification payload.
    Supported types: CSV, Excel, PDF, Image, Word, JSON, SQL Dump, Parquet, Database, API.
    """
    ext = (filename.split(".")[-1].lower() if "." in filename else "").strip()
    header_bytes = file_bytes[:1024]
    
    # 1. Parquet Magic Bytes: 'PAR1'
    if header_bytes.startswith(b"PAR1"):
        return "parquet", {"extension": ext, "confidence": 1.0, "details": "Detected Parquet file magic header"}
        
    # 2. PDF Magic Bytes: '%PDF'
    if header_bytes.startswith(b"%PDF"):
        return "pdf", {"extension": ext, "confidence": 1.0, "details": "Detected PDF file magic header"}
        
    # 3. Image Magic Bytes: PNG, JPEG, GIF, WEBP
    if header_bytes.startswith(b"\x89PNG\r\n\x1a\n") or header_bytes.startswith(b"\xff\xd8\xff") or header_bytes.startswith(b"GIF89a") or b"WEBP" in header_bytes[:12]:
        return "image", {"extension": ext, "confidence": 1.0, "details": "Detected image binary signature"}
        
    # 4. ZIP/Office files (Excel .xlsx, Word .docx start with PK ZIP header b"PK\x03\x04")
    if header_bytes.startswith(b"PK\x03\x04"):
        if ext in ["xlsx", "xls", "xlsm"]:
            return "excel", {"extension": ext, "confidence": 0.95, "details": "Excel format with ZIP compression"}
        if ext in ["docx", "doc"]:
            return "word", {"extension": ext, "confidence": 0.95, "details": "Word document format with ZIP compression"}
        
    # 5. Excel legacy .xls header binary signature
    if header_bytes.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return "excel", {"extension": ext, "confidence": 1.0, "details": "Legacy XLS binary format"}

    # 6. Plain text checks (SQL, CSV, JSON)
    try:
        sample_text = header_bytes.decode("utf-8", errors="ignore").strip()
        
        # Check for JSON: starts with { or [
        if sample_text.startswith("{") or sample_text.startswith("["):
            # Verify if it closes or contains keys
            if ":" in sample_text or "," in sample_text:
                return "json", {"extension": ext, "confidence": 0.90, "details": "Text content resembles JSON structure"}
                
        # Check for SQL: contains typical keywords (CREATE TABLE, INSERT INTO, select)
        sql_keywords = [r"create\s+table", r"insert\s+into", r"select\s+.*\s+from", r"drop\s+table"]
        if any(re.search(kw, sample_text, re.IGNORECASE) for kw in sql_keywords):
            return "sql_dump", {"extension": ext, "confidence": 0.90, "details": "Contains structured SQL statements"}
            
        # Check for CSV/TSV: comma or tab separated fields in first few lines
        lines = [l for l in sample_text.split("\n") if l.strip()]
        if lines:
            first_line = lines[0]
            commas = first_line.count(",")
            tabs = first_line.count("\t")
            semicolons = first_line.count(";")
            if commas > 1 and commas >= tabs and commas >= semicolons:
                return "csv", {"extension": ext, "confidence": 0.85, "details": "Comma-separated structured lines"}
            if tabs > 1 and tabs >= commas and tabs >= semicolons:
                return "csv", {"extension": ext, "confidence": 0.85, "details": "Tab-separated structured lines"}
            if semicolons > 1 and semicolons >= commas and semicolons >= tabs:
                return "csv", {"extension": ext, "confidence": 0.85, "details": "Semicolon-separated structured lines"}
    except Exception:
        pass

    # 7. Fallback to file extension
    if ext in ["csv", "tsv"]:
        return "csv", {"extension": ext, "confidence": 0.80, "details": "Fallback based on file extension"}
    if ext in ["xlsx", "xls", "xlsm", "ods"]:
        return "excel", {"extension": ext, "confidence": 0.80, "details": "Fallback based on file extension"}
    if ext in ["json"]:
        return "json", {"extension": ext, "confidence": 0.80, "details": "Fallback based on file extension"}
    if ext in ["sql"]:
        return "sql_dump", {"extension": ext, "confidence": 0.80, "details": "Fallback based on file extension"}
    if ext in ["pdf"]:
        return "pdf", {"extension": ext, "confidence": 0.80, "details": "Fallback based on file extension"}
    if ext in ["png", "jpg", "jpeg", "webp", "gif", "tiff", "bmp"]:
        return "image", {"extension": ext, "confidence": 0.80, "details": "Fallback based on file extension"}
    if ext in ["docx", "doc"]:
        return "word", {"extension": ext, "confidence": 0.80, "details": "Fallback based on file extension"}
    if ext in ["parquet"]:
        return "parquet", {"extension": ext, "confidence": 0.80, "details": "Fallback based on file extension"}

    # Default to raw text/binary
    return "text", {"extension": ext, "confidence": 0.50, "details": "Unknown file format, default to plain text"}
