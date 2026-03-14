import { describe, it, expect, beforeEach } from 'vitest'
import { buildSystemPrompt, invalidateSchemaCache } from '../../src/llm/schema-loader.js'

describe('schema loader', () => {
  beforeEach(() => {
    invalidateSchemaCache()
  })

  it('builds a system prompt that includes key table names', async () => {
    const prompt = await buildSystemPrompt()
    expect(prompt).toContain('trn_voucher')
    expect(prompt).toContain('mst_ledger')
    expect(prompt).toContain('trn_accounting')
  })

  it('includes column names for key tables', async () => {
    const prompt = await buildSystemPrompt()
    expect(prompt).toContain('voucher_type')
    expect(prompt).toContain('party_name')
  })

  it('caches: calling twice returns the same string', async () => {
    const p1 = await buildSystemPrompt()
    const p2 = await buildSystemPrompt()
    expect(p1).toBe(p2)
  })

  it('invalidateSchemaCache forces a fresh rebuild', async () => {
    const p1 = await buildSystemPrompt()
    invalidateSchemaCache()
    const p2 = await buildSystemPrompt()
    // Both should contain the schema but are independently built — equal content
    expect(p2).toContain('trn_voucher')
    expect(p1).toBe(p2) // same DB → same output
  })
})
