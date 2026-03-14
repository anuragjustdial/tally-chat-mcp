import { describe, it, expect } from 'vitest'
import { db, rawQuery } from '../../src/db/kysely.js'

describe('kysely db', () => {
  it('connects and runs a simple select', async () => {
    const result = await rawQuery<{ val: number }>('SELECT 1 AS val')
    expect(result[0].val).toBe(1)
  })

  it('can query config table via Kysely builder', async () => {
    const rows = await db.selectFrom('config').selectAll().limit(1).execute()
    expect(Array.isArray(rows)).toBe(true)
  })
})
