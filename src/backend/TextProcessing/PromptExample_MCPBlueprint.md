### MCP Blueprint Request
- **MCP Name:** `InvoiceAuditMCP`
- **Business Goal:** Automatically validate daily vendor invoices, flag
  anomalies, and produce an approval-ready summary for finance.
- **Authority / Access Level:** Read-only access to `/finance/invoices/*.csv`
  plus permission to write reports under `/finance/reports/`.

#### Functionalities
1. **Core Responsibility:** Import and normalize invoices.
   - Inputs: Daily CSV exports (ISO-8859-1) dropped in
     `/finance/invoices/YYYY-MM-DD-invoices.csv`.
   - Operations: `load_invoices(file_path)` that parses, converts currency to
     USD, and enforces schema.
   - Outputs: Structured JSON array stored in memory for downstream steps.
2. **Core Responsibility:** Run anomaly checks.
   - Inputs: Normalized invoice JSON, vendor risk scores (from
     `/finance/config/vendor_risk.json`).
   - Operations: `detect_anomalies(dataset, config)` returning issues with
     severity, vendor id, and rule hit.
   - Outputs: `anomaly_report.json` saved under
     `/finance/reports/YYYY-MM-DD/`.
3. **Core Responsibility:** Generate approval summary.
   - Inputs: Anomaly findings + aggregate stats.
   - Operations: `render_summary(markdown_payload)` that writes
     `invoice-summary.md`.
   - Outputs: Markdown report with pass/fail status and next actions.

#### Non-Goals
- Does not approve invoices or push data to ERP.
- Does not modify vendor risk configs.
