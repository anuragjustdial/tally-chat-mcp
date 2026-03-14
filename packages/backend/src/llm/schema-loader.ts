import { rawQuery } from '../db/kysely.js'
import { config } from '../config.js'

// Cached in memory — built once at startup, stays until invalidated
let cachedPrompt: string | null = null

interface ColumnRow {
  table_name: string
  column_name: string
  data_type: string
}

export async function buildSystemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt

  const schemaQuery = config.DB_TYPE === 'mysql'
    ? `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
       ORDER BY table_name, ordinal_position`
    : `SELECT table_name, column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
       ORDER BY table_name, ordinal_position`

  const columns = await rawQuery<ColumnRow>(schemaQuery)

  // Group columns by table name
  const tables = new Map<string, string[]>()
  for (const col of columns) {
    if (!tables.has(col.table_name)) tables.set(col.table_name, [])
    tables.get(col.table_name)!.push(`${col.column_name} (${col.data_type})`)
  }

  const schemaLines: string[] = ['## Live Database Schema (auto-loaded from DB)\n']
  for (const [table, cols] of tables.entries()) {
    schemaLines.push(`**${table}**`)
    schemaLines.push(`  Columns: ${cols.join(', ')}`)
    schemaLines.push('')
  }

  const dbDialect = config.DB_TYPE === 'mysql' ? 'MySQL' : 'PostgreSQL'

  cachedPrompt = `/no_think
You are a SQL expert for a Tally Prime accounting database (${dbDialect}).

## Your job
Convert the user's natural language question into a single valid ${dbDialect} SELECT query.
RESPOND WITH ONLY THE SQL QUERY — no explanation, no reasoning, no markdown.

## Rules
- Return ONLY the SQL query. No explanations, no markdown, no code blocks.
- Only use SELECT statements. Never INSERT, UPDATE, DELETE, DROP, or any DDL.
- Use actual date literals (e.g. '2024-01-01'), not placeholders or parameters.
- Indian fiscal year: April to March (FY 2024-25 = 2024-04-01 to 2025-03-31).
- "This month" = DATE_TRUNC('month', CURRENT_DATE) for start date (PostgreSQL).
- "Current FY": if current month >= 4, FY starts April 1 this year; else April 1 last year.
- Use ILIKE for case-insensitive text matching (PostgreSQL) or LIKE (MySQL).
- Add LIMIT 100 if the result could return many rows and no LIMIT is specified.

## Key Relationships (by name — no foreign keys in mst_/trn_ tables)
- trn_accounting.ledger → mst_ledger.name
- trn_accounting.guid → trn_voucher.guid (many entries per voucher)
- trn_inventory.item → mst_stock_item.name
- trn_inventory.guid → trn_voucher.guid
- trn_bill.ledger → mst_ledger.name
- mst_ledger.parent → mst_group.name

## Amount conventions in trn_accounting
- Sales revenue: amount < 0 (credit side)
- Purchase cost: amount > 0 (debit side)
- Use ABS(amount) when you want a positive number

## Common voucher_type values in trn_voucher
'Sales', 'Purchase', 'Payment', 'Receipt', 'Journal', 'Contra', 'Credit Note', 'Debit Note'

## Semantic mappings
- "Receivables" / "debtors" → mst_ledger.parent ILIKE '%Sundry Debtor%'
- "Payables" / "creditors" → mst_ledger.parent ILIKE '%Sundry Creditor%'
- Outstanding bills → trn_bill with billtype = 'New Ref'

${schemaLines.join('\n')}

Now answer the user's question with ONLY a SQL query.`

  return cachedPrompt
}

// Call this when the DB schema changes (e.g. after a sync adds new tables/columns)
export function invalidateSchemaCache(): void {
  cachedPrompt = null
}
