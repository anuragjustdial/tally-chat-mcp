import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock LLM client so tests don't need LM Studio running
vi.mock('../../src/llm/client.js', () => ({
  llmClient: {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: "SELECT SUM(ABS(a.amount)) AS total_sales FROM trn_voucher v JOIN trn_accounting a ON a.guid = v.guid WHERE v.voucher_type = 'Sales'"
            }
          }]
        })
      }
    }
  }
}))

import { generateSql, extractSql } from '../../src/llm/sql-generator.js'
import { llmClient } from '../../src/llm/client.js'

describe('extractSql', () => {
  it('extracts from ```sql fence', () => {
    expect(extractSql('```sql\nSELECT 1\n```')).toBe('SELECT 1')
  })

  it('handles Qwen3 thinking mode output (reasoning before SQL)', () => {
    const thinkingOutput = `Let me think about this query...
The user wants sales data.

\`\`\`sql
SELECT SUM(ABS(a.amount)) FROM trn_voucher v JOIN trn_accounting a ON a.guid = v.guid
\`\`\``
    const result = extractSql(thinkingOutput)
    expect(result).toContain('SELECT')
    expect(result).not.toContain('Let me think')
    expect(result).not.toContain('```')
  })

  it('extracts SELECT when no code fence present', () => {
    const output = 'Here is the query:\nSELECT * FROM trn_voucher LIMIT 10'
    expect(extractSql(output)).toBe('SELECT * FROM trn_voucher LIMIT 10')
  })

  it('returns plain SQL unchanged', () => {
    expect(extractSql('SELECT 1 AS val')).toBe('SELECT 1 AS val')
  })
})

describe('generateSql', () => {
  it('returns a SQL string from the LLM response', async () => {
    const sql = await generateSql('What are my total sales?', [])
    expect(typeof sql).toBe('string')
    expect(sql.toUpperCase()).toContain('SELECT')
  })

  it('strips markdown code fences if LLM wraps the SQL', async () => {
    vi.mocked(llmClient.chat.completions.create).mockResolvedValueOnce({
      choices: [{ message: { content: '```sql\nSELECT 1 AS val\n```' } }]
    } as any)
    const sql = await generateSql('test', [])
    expect(sql).toBe('SELECT 1 AS val')
    expect(sql).not.toContain('```')
  })

  it('strips plain code fences', async () => {
    vi.mocked(llmClient.chat.completions.create).mockResolvedValueOnce({
      choices: [{ message: { content: '```\nSELECT 2 AS val\n```' } }]
    } as any)
    const sql = await generateSql('test', [])
    expect(sql).toBe('SELECT 2 AS val')
  })

  it('passes last 6 history messages to the LLM', async () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `msg ${i}`,
    }))
    await generateSql('new question', history)
    const call = vi.mocked(llmClient.chat.completions.create).mock.calls.at(-1)![0]
    // system + 6 history + 1 user question = 8 messages
    expect(call.messages.length).toBe(8)
  })
})
