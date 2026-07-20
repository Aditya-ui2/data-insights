# Customization Rules for Antigravity Coding Assistant

This file defines workspace-scoped rules and behavioral guidelines. Antigravity will automatically load and prioritize these instructions for all future tasks in this repository.

## Core Directives

1. **NO HARDCODING:**
   - Under no circumstances should logic be written specifically for a single spreadsheet, customer name, or transaction row.
   - All logic for schema parsing, table merging, number formatting, KPI discovery, and dashboard config binding must remain generic and schema-agnostic to support arbitrary future datasets.

2. **DIVERSE SHEET ROBUSTNESS:**
   - The ingestion, cleaning, and aggregation logics must be continuously refined and updated based on real-world edge cases (e.g., column shifts, mixed types, OCR misalignments, pre-existing totals).
   - Ensure complete support for international and regional Hinglish data formats (e.g., currency symbols, number representations like "Lakhs"/"Cr", and trailing formatting signs like `/-`).

3. **ZERO-FAILURE RELIABILITY:**
   - Maintain robust local rule-based fallbacks for KPI discovery and chart generation to ensure the application works perfectly even when external LLM APIs (Gemini/Groq) are down, quota-exhausted, or rate-limited.

4. **ITERATIVE REFINEMENT:**
   - Treat errors or anomalies from new sheets as opportunities to improve the core algorithms of the parser, validator, and discovery engine rather than writing ad-hoc patches.
