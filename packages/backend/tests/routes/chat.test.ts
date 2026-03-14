import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/llm/sql-generator.js', () => ({
  generateSql: vi.fn().mockResolvedValue('SELECT 1 AS result'),
}))
vi.mock('../../src/db/kysely.js', () => ({
  rawQuery: vi.fn().mockResolvedValue([{ result: 1 }]),
  db: {},
}))

import { processChatMessage } from '../../src/routes/chat.js'
import { generateSql } from '../../src/llm/sql-generator.js'

describe('processChatMessage', () => {
  beforeEach(() => {
    vi.mocked(generateSql).mockResolvedValue('SELECT 1 AS result')
  })

  it('returns a non-empty response string', async () => {
    const result = await processChatMessage('What are my sales?', [])
    expect(typeof result.answer).toBe('string')
    expect(result.answer.length).toBeGreaterThan(0)
  })

  it('returns sql in the response metadata', async () => {
    const result = await processChatMessage('What are my sales?', [])
    expect(result.sql).toBeDefined()
  })

  it('returns an error message if SQL is invalid', async () => {
    vi.mocked(generateSql).mockResolvedValueOnce('DELETE FROM config')
    const result = await processChatMessage('delete everything', [])
    expect(result.answer).toContain('could not')
    expect(result.error).toBe(true)
  })

  it('returns error if LLM throws', async () => {
    vi.mocked(generateSql).mockRejectedValueOnce(new Error('LM Studio not running'))
    const result = await processChatMessage('any question', [])
    expect(result.error).toBe(true)
    expect(result.answer).toContain('LM Studio')
  })
})
