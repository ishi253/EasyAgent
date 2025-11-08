## Task 1: MCP Blueprint

# MCP Functionality Definition Prompt

**Purpose:** Describe a new MCP instance so builders or automated systems
can implement it with full clarity.

----------
### MCP Blueprint Request
- **MCP Name:** `sheets-cost-analyzer`
- **Business Goal:** `Automate the collection, categorization, and visualization of monthly expenses in Google Sheets with minimal manual intervention`
- **Authority / Access Level:** `Read/write access to designated Google Sheets, read-only access to financial data sources (bank statements, credit card exports), no ability to initiate transactions`

#### Functionalities
1. **Core Responsibility:** `Data Collection and Import`
   - Inputs: 
     - CSV/Excel files from bank statements
     - Manual expense entries (date, amount, category, description)
     - Google Sheets document ID or URL
   - Operations:
     - `parse_financial_file()` - Extract transactions from CSV/Excel
     - `validate_transactions()` - Check for duplicates and format consistency
     - `import_to_sheet()` - Write parsed data to specified sheet range
   - Outputs: 
     - Confirmation of rows imported
     - List of any rejected/invalid transactions
     - Updated timestamp in sheet

2. **Core Responsibility:** `Expense Categorization`
   - Inputs:
     - Transaction descriptions
     - Custom category rules/mappings
     - Historical categorization patterns
   - Operations:
     - `auto_categorize()` - Apply ML or rule-based categorization
     - `suggest_category()` - Propose categories for ambiguous items
     - `update_category_rules()` - Learn from user corrections
   - Outputs:
     - Categorized transaction list
     - Confidence scores for auto-categorized items
     - List of transactions requiring manual review

3. **Core Responsibility:** `Report Generation and Visualization`
   - Inputs:
     - Date range (default: current month)
     - Report template preferences
     - Comparison periods (optional)
   - Operations:
     - `generate_monthly_summary()` - Create spending breakdown by category
     - `create_charts()` - Generate pie charts, trend lines in sheets
     - `calculate_metrics()` - Compute totals, averages, variances
     - `format_sheet()` - Apply consistent styling and formulas
   - Outputs:
     - Formatted summary sheet with totals
     - Visual charts embedded in Google Sheets
     - Month-over-month comparison data

#### Non-Goals
- Must NOT modify source financial files or original bank data
- Must NOT share financial data outside designated Google Sheets
- Must NOT make financial recommendations or investment advice
- Must NOT process payments or initiate transfers
- Must NOT store credentials or sensitive banking information

## Task 2: MCP Agent Instructions

# MCP Agent Run Instruction Prompt

**Purpose:** Provide an agent (already connected to the MCP) with the exact
steps it must take to execute a task successfully.

----------
### MCP Execution Prompt
**Task:** `Process and analyze this month's expenses to update the monthly cost breakdown spreadsheet with categorized transactions and summary visualizations`

**Context:**
- **Environment:** `Google Workspace connected environment with sheets-cost-analyzer MCP v1.0`
- **Recent Activity:** `Last processed: Previous month's data on the 1st. No pending imports identified.`
- **Dependencies:** 
  - Master spreadsheet: `Monthly_Expenses_2024.gsheet`
  - Category mapping file: `expense_categories.json`
  - Bank export folder: `~/Downloads/bank_exports/`
- **Deadlines / SLAs:** `Complete processing within 5 minutes of initiation, generate report by 3rd of each month`

#### Required MCP Calls
1. `parse_financial_file(file_path="~/Downloads/bank_exports/", file_pattern="*.csv")`
   - Use when: New export files detected in folder
   - Expected response: `{transactions: [...], count: int, parse_errors: []}`
   - Follow-up: If parse_errors exist, log them and continue with valid transactions

2. `validate_transactions(transactions=<parsed_data>, sheet_id="Monthly_Expenses_2024")`
   - Use when: After successful file parsing
   - Expected response: `{valid: [...], duplicates: [...], invalid: []}`
   - Follow-up: Only process valid, non-duplicate transactions

3. `auto_categorize(transactions=<validated_data>, rules_file="expense_categories.json")`
   - Use when: Have validated transactions to categorize
   - Expected response: `{categorized: [...], uncertain: [...], confidence_map: {}}`
   - Follow-up: Flag uncertain items for user review

4. `import_to_sheet(sheet_id="Monthly_Expenses_2024", data=<categorized_data>, target_range="A:F")`
   - Use when: Categorization complete
   - Expected response: `{rows_added: int, range_updated: str, timestamp: datetime}`
   - Follow-up: Proceed to report generation if successful

5. `generate_monthly_summary(sheet_id="Monthly_Expenses_2024", month=<current_month>)`
   - Use when: All data imported successfully
   - Expected response: `{summary: {...}, totals_by_category: {...}}`
   - Follow-up: Create visualizations

6. `create_charts(sheet_id="Monthly_Expenses_2024", chart_type="pie", data_range=<summary_range>)`
   - Use when: Summary data is ready
   - Expected response: `{chart_id: str, chart_url: str}`
   - Follow-up: Confirm chart visibility in sheet

#### Step-by-Step Instructions
1. Validate prerequisites:
   - Check connection to Google Sheets API
   - Verify `Monthly_Expenses_2024` sheet exists and is accessible
   - Confirm bank export files present in `~/Downloads/bank_exports/`

2. Invoke `parse_financial_file()` to extract all transactions from available CSV files
   - Log the count of transactions found
   - If no files found, alert user and exit

3. Invoke `validate_transactions()` with parsed data
   - Remove duplicates against existing sheet data
   - Log count of duplicates removed

4. Invoke `auto_categorize()` on validate