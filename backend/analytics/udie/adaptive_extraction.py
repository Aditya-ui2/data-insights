import io
from typing import List, Dict, Any, Tuple

def extract_tables_adaptive(file_bytes: bytes, pdf_info: Dict[str, Any]) -> Tuple[List[List[str]], str]:
    """
    Module 3: Adaptive Extraction Pipeline.
    Chooses correct extraction library (pdfplumber/PyMuPDF vs OCR) page by page.
    Returns: (raw_tables, isolated_text)
    """
    import pdfplumber

    raw_tables = []
    text_content_list = []
    pdf_type = pdf_info.get("pdfType", "digital")
    
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for i, page in enumerate(pdf.pages):
                # 1. Determine page type
                page_text = page.extract_text() or ""
                is_scanned_page = not page_text.strip()
                
                # Extract text for RAG
                if page_text.strip():
                    text_content_list.append(page_text)
                
                # 2. Extract tables based on page type
                if not is_scanned_page:
                    # Digital Page: Extract tables directly using pdfplumber's vector engine (Never run OCR)
                    tables = page.extract_tables()
                    if tables:
                        for table in tables:
                            # Clean empty lines or trailing empty cells
                            cleaned_t = [[str(cell or "").strip() for cell in row] for row in table if any(row)]
                            if cleaned_t:
                                raw_tables.append(cleaned_t)
                else:
                    # Scanned Page: Try running OCR
                    # First check for EasyOCR or PaddleOCR
                    ocr_success = False
                    try:
                        import easyocr
                        import numpy as np
                        from PIL import Image
                        
                        # Render page image to numpy array
                        img = page.to_image(resolution=150).original
                        img_np = np.array(img)
                        
                        reader = easyocr.Reader(['en'])
                        ocr_result = reader.readtext(img_np)
                        
                        # Reconstruct basic rows based on Y bounding box proximity
                        # Group by y coordinates
                        lines_dict = {}
                        for bbox, text_val, conf in ocr_result:
                            # bbox: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
                            y_center = (bbox[0][1] + bbox[2][1]) / 2.0
                            x_left = bbox[0][0]
                            
                            # Find matching horizontal row (within 10 pixels tolerance)
                            found_row = None
                            for y_coord in lines_dict.keys():
                                if abs(y_coord - y_center) < 15:
                                    found_row = y_coord
                                    break
                            
                            if found_row is None:
                                found_row = y_center
                                lines_dict[found_row] = []
                            lines_dict[found_row].append((x_left, text_val))
                            
                        # Sort lines by y coordinate (vertical flow)
                        sorted_y = sorted(lines_dict.keys())
                        ocr_table = []
                        for y in sorted_y:
                            # Sort words by x coordinate (horizontal flow)
                            sorted_words = [word for x, word in sorted(lines_dict[y])]
                            ocr_table.append(sorted_words)
                            
                        if ocr_table:
                            raw_tables.append(ocr_table)
                            ocr_success = True
                            text_content_list.append("\n".join([" ".join(row) for row in ocr_table]))
                    except Exception as ocr_err:
                        print(f"[Adaptive Extract Page {i}] OCR fallback libraries missing or failed: {ocr_err}")
                        
                    # If OCR failed or wasn't available, fallback to basic character positioning if available
                    if not ocr_success:
                        # Extract characters directly to reconstruct raw table lines
                        # (Sometimes scanned PDFs have hidden text layers from previous bad conversions)
                        chars = page.chars
                        if chars:
                            lines_dict = {}
                            for c in chars:
                                y = round(c["top"], 1)
                                x = c["x0"]
                                char_text = c["text"]
                                found_y = None
                                for y_key in lines_dict.keys():
                                    if abs(y_key - y) < 5:
                                        found_y = y_key
                                        break
                                if found_y is None:
                                    found_y = y
                                    lines_dict[found_y] = []
                                lines_dict[found_y].append((x, char_text))
                            
                            sorted_y = sorted(lines_dict.keys())
                            fallback_lines = []
                            for y in sorted_y:
                                sorted_chars = "".join([char for x, char in sorted(lines_dict[y])])
                                fallback_lines.append(sorted_chars)
                            text_content_list.append("\n".join(fallback_lines))
                            
    except Exception as e:
        print(f"[Adaptive Extract] Error extracting: {e}")
        
    full_text = "\n\n".join(text_content_list)
    return raw_tables, full_text
