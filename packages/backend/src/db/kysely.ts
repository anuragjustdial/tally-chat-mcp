import { Kysely, sql as ksql } from 'kysely'
import { createDialect } from './dialect.js'

// Minimal type definitions for tables used in predefined queries
interface ConfigTable    { name: string; value: string | null }
interface MstLedger      { name: string; parent: string; closing_balance: number; gstn: string | null }
interface MstGroup       { name: string; parent: string | null; is_revenue: number }
interface MstStockItem   { name: string; uom: string; closing_balance: number; closing_value: number }
interface TrnVoucher     { guid: string; date: Date; voucher_type: string; party_name: string | null }
interface TrnAccounting  { guid: string; ledger: string; amount: number }
interface TrnInventory   { guid: string; item: string; quantity: number; amount: number }
interface TrnBill        { guid: string; ledger: string; amount: number; billtype: string | null }

export interface Database {
  config: ConfigTable
  mst_ledger: MstLedger
  mst_group: MstGroup
  mst_stock_item: MstStockItem
  trn_voucher: TrnVoucher
  trn_accounting: TrnAccounting
  trn_inventory: TrnInventory
  trn_bill: TrnBill
}

const dialect = await createDialect()
export const db = new Kysely<Database>({ dialect })

// Executes LLM-generated raw SQL through Kysely's connection pool (works for both PostgreSQL and MySQL)
export async function rawQuery<T extends Record<string, unknown>>(
  sqlString: string
): Promise<T[]> {
  const result = await ksql<T>`${ksql.raw(sqlString)}`.execute(db)
  return result.rows
}
