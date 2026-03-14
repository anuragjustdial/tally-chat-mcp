import NodeSqlParser from 'node-sql-parser'
const { Parser } = NodeSqlParser

export class SqlValidationError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'SqlValidationError'
  }
}

// All 41 tables found in the live DB
const ALLOWED_TABLES = new Set([
  // Core Tally tables (mst_* and trn_*)
  'config',
  'mst_group', 'mst_ledger', 'mst_vouchertype', 'mst_uom',
  'mst_godown', 'mst_stock_category', 'mst_stock_group', 'mst_stock_item',
  'mst_cost_category', 'mst_cost_centre', 'mst_attendance_type',
  'mst_employee', 'mst_payhead', 'mst_gst_effective_rate',
  'mst_opening_batch_allocation', 'mst_opening_bill_allocation',
  'mst_stockitem_standard_cost', 'mst_stockitem_standard_price',
  'trn_voucher', 'trn_accounting', 'trn_inventory', 'trn_cost_centre',
  'trn_cost_category_centre', 'trn_cost_inventory_category_centre',
  'trn_bill', 'trn_bank', 'trn_batch', 'trn_inventory_additional_cost',
  'trn_employee', 'trn_payhead', 'trn_attendance', 'trn_closingstock_ledger',
  // Multi-tenant normalized tables
  'companies', 'groups', 'ledgers', 'stock_groups', 'stock_items',
  'vouchers', 'voucher_entries', 'sync_history',
])

const parser = new Parser()

export function validateSql(sql: string): void {
  if (sql.includes(';')) {
    throw new SqlValidationError('Multiple statements not allowed')
  }

  let ast: ReturnType<typeof parser.astify>
  try {
    ast = parser.astify(sql, { database: 'PostgresQL' })
  } catch (e) {
    throw new SqlValidationError(`SQL parse error: ${(e as Error).message}`)
  }

  const stmt = Array.isArray(ast) ? ast[0] : ast
  if ((stmt as any).type !== 'select') {
    throw new SqlValidationError(`Only SELECT allowed. Got: ${(stmt as any).type}`)
  }

  const tableRefs = parser.tableList(sql, { database: 'PostgresQL' })
  for (const ref of tableRefs) {
    const table = ref.split('::')[2]
    if (table && !ALLOWED_TABLES.has(table)) {
      throw new SqlValidationError(`Table not permitted: ${table}`)
    }
  }
}
