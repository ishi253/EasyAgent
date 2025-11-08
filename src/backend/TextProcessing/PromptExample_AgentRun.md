# Example – MCP Agent Run Instruction Prompt

### MCP Execution Prompt
**Task:** Publish today's invoice audit summary to FinanceOps.
**Context:**
- **Environment:** Repo `/finance-tools`, branch `prod`; Python 3.11 runtime.
- **Recent Activity:** Last successful run on 2024-04-18; vendor risk config
  updated yesterday.
- **Dependencies:** Use `InvoiceAuditMCP` outputs saved under
  `/finance/reports/2024-04-19/`; retain existing anomaly JSON if present.
- **Deadlines / SLAs:** Summary must reach FinanceOps by 14:00 UTC.

#### Required MCP Calls
1. `load_invoices(file_path="/finance/invoices/2024-04-19-invoices.csv")`
   - Use when: Starting the workflow; ensures data is normalized.
   - Expected response: `{ "status": "ok", "records": [...], "control_sum": <int> }`
   - Follow-up: If `status != ok`, abort and page accounting.
2. `detect_anomalies(dataset=<records>, config_path="/finance/config/vendor_risk.json")`
   - Use when: After successful load.
   - Expected response: `{ "issues": [...], "stats": {...} }`
   - Follow-up: Store response locally as `anomaly_report.json`.
3. `render_summary(payload=<markdown-ready object>)`
   - Use when: Anomaly detection completes.
   - Expected response: `{ "file_path": "/finance/reports/.../invoice-summary.md" }`
   - Follow-up: Publish the markdown to FinanceOps Slack channel.

#### Step-by-Step Instructions
1. Validate that today's invoice CSV exists and size < 25MB.
2. Invoke `load_invoices` with today's file; confirm control sum matches CSV
   footer.
3. If control sum mismatches, halt and notify `#finance-alerts`.
4. Call `detect_anomalies` using the normalized dataset; wait for completion.
5. Interpret the response:
   - If `issues` array empty → set status `"PASS"` and note zero anomalies.
   - If `issues` contains `severity: "critical"` → mark `"FAIL"` and attach
     issue IDs.
6. Build markdown payload with totals, anomaly counts, and run timestamp.
7. Invoke `render_summary` with the payload; ensure file path matches today's
   folder.
8. Post a summary message to FinanceOps with a link to the markdown file.
9. Archive the anomaly JSON in `/finance/archive/2024-04-19/`.
