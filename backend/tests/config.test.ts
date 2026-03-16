import { describe, it, expect, beforeEach } from 'vitest'

describe('config', () => {
  beforeEach(() => {
    // Reset module cache so config re-reads env
    vi.resetModules()
  })

  it('parses valid env correctly', async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db'
    process.env.LLM_BASE_URL = 'http://localhost:1234/v1'
    process.env.LLM_MODEL = 'qwen3'
    process.env.DB_TYPE = 'postgres'
    const { config } = await import('../src/config.js')
    expect(config.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/db')
    expect(config.PORT).toBe(3001)
    expect(config.DB_TYPE).toBe('postgres')
  })
})
