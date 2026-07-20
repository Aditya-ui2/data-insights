import io
from typing import Dict, Any, List

def classify_pdf(file_bytes: bytes) -> Dict[str, Any]:
    """
    Module 2: PDF Intelligence Engine.
    Analyzes structure, page layout, and presence of text to classify the PDF type.
    """
    import pdfplumber

    pdf_type = "digital"
    total_pages = 0
    pages_with_text = 0
    pages_with_tables = 0
    total_characters = 0
    has_invoice_keywords = False
    
    invoice_indicators = ["invoice", "bill", "challan", "receipt", "gstin", "invoice no", "amount due", "payment due", "total value"]
    
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            total_pages = len(pdf.pages)
            for page in pdf.pages:
                text = page.extract_text() or ""
                total_characters += len(text)
                
                # Check for text presence
                if text.strip():
                    pages_with_text += 1
                    
                # Check for tables
                tables = page.extract_tables()
                if tables:
                    pages_with_tables += 1
                    
                # Check keywords (case-insensitive)
                text_lower = text.lower()
                if any(ind in text_lower for ind in invoice_indicators):
                    has_invoice_keywords = True
                    
    except Exception as e:
        return {
            "pdfType": "unknown",
            "totalPages": 0,
            "confidence": 0.5,
            "details": f"Error analyzing PDF: {str(e)}",
            "features": {"hasText": False, "hasTables": False}
        }

    # Classification logic
    if total_pages == 0:
        return {"pdfType": "unknown", "totalPages": 0, "confidence": 0.5, "details": "PDF has no pages"}

    # Scanned vs Digital vs Mixed
    has_text = pages_with_text > 0
    all_pages_have_text = pages_with_text == total_pages
    some_pages_have_text = 0 < pages_with_text < total_pages
    
    if not has_text:
        pdf_type = "scanned"
    elif some_pages_have_text:
        pdf_type = "mixed"
    else:
        pdf_type = "digital"

    # Layout classification (Spreadsheet vs Invoice vs Report vs Hybrid)
    layout = "report"
    confidence = 0.90
    
    if pdf_type == "scanned":
        layout = "scanned_image"
        confidence = 0.85
    elif pages_with_tables / total_pages >= 0.8:
        layout = "spreadsheet" if total_characters > 10000 else "table_heavy"
    elif has_invoice_keywords and total_pages <= 3:
        layout = "invoice"
        confidence = 0.92
    elif pages_with_tables > 0:
        layout = "hybrid"
        confidence = 0.80

    return {
        "pdfType": pdf_type,
        "layout": layout,
        "totalPages": total_pages,
        "confidence": confidence,
        "features": {
            "pagesWithText": pages_with_text,
            "pagesWithTables": pages_with_tables,
            "totalCharacters": total_characters,
            "hasInvoiceKeywords": has_invoice_keywords
        },
        "details": f"Classified PDF as {pdf_type} ({layout}) over {total_pages} pages."
    }
