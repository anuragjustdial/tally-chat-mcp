import { config } from '../config.js'
import type { Dialect } from 'kysely'

export async function createDialect(): Promise<Dialect> {
  if (config.DB_TYPE === 'mysql') {
    // mysql2 only needed when DB_TYPE=mysql — install with: pnpm add mysql2
    const { createPool } = await import('mysql2/promise')
    const { MysqlDialect } = await import('kysely')
    return new MysqlDialect({ pool: createPool(config.DATABASE_URL) })
  }

  // Default: PostgreSQL
  const pg = await import('pg')
  const { PostgresDialect } = await import('kysely')
  return new PostgresDialect({
    pool: new pg.default.Pool({ connectionString: config.DATABASE_URL, max: 10 }),
  })
}
