---
    1. status: "success" — SQL ran, rows returned

    {
      "status": "success",
      "question": "...",
      "sql": "SELECT ...",
      "columns": ["col1", "col2"],
      "rows": [[val1, val2], [...]],
      "rows_returned": 5,
      "message": null,
      "attempts": 1
    }
    FE action: Render table using columns + rows

    ---
    2. status: "success" — SQL ran, zero rows

    {
      "status": "success",
      "question": "...",
      "sql": "SELECT ...",
      "columns": ["col1", "col2"],
      "rows": [],
      "rows_returned": 0,
      "message": "I found no data for \"...\". This could mean there are no matching records in your Tally data for the selected period.",
      "attempts": 1
    }
    FE condition: status === "success" && rows_returned === 0 → show message instead of table

    ---
    3. status: "non_sql" — LLM replied with text, not SQL

    {
      "status": "non_sql",
      "question": "...",
      "sql": null,
      "columns": null,
      "rows": null,
      "rows_returned": null,
      "message": "<raw LLM reply text>",
      "attempts": 1
    }
    FE action: Show message as a chatbot reply directly

    ---
    4. status: "max_retries" — SQL kept failing after retries

    {
      "status": "max_retries",
      "question": "...",
      "sql": "SELECT ...",
      "columns": null,
      "rows": null,
      "rows_returned": null,
      "message": "<last DB error string>",
      "attempts": 2
    }
    FE action: Show an error — "Couldn't process your query, please rephrase"

    ---
    5. status: "api_error" — LLM API call failed

    {
      "status": "api_error",
      "question": "...",
      "sql": null,
      "columns": null,
      "rows": null,
      "rows_returned": null,
      "message": "<API error string>",
      "attempts": 1
    }
    FE action: Show a system-level error — "AI service unavailable"

    ---
    FE Decision Tree Summary

    status === "success"
      └─ rows_returned > 0  → render table
      └─ rows_returned === 0 → show message

    status === "non_sql"    → show message as chatbot reply

    status === "max_retries" → show error UI (query failed)

    status === "api_error"   → show error UI (service down)