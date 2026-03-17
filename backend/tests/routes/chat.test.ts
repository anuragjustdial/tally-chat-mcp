import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { processChatMessage } from '../../src/routes/chat.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  } as unknown as Response
}

beforeEach(() => {
  mockFetch.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('processChatMessage', () => {
  it('success with rows — returns formatted markdown table', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      status: 'success',
      question: 'What are my sales?',
      sql: 'SELECT * FROM trn_accounting',
      columns: ['name', 'amount'],
      rows: [['Acme Corp', 50000]],
      rows_returned: 1,
      message: null,
      attempts: 1,
    }))

    const result = await processChatMessage('What are my sales?')

    expect(result.error).toBeUndefined()
    expect(result.answer).toContain('name')
    expect(result.answer).toContain('Acme Corp')
    expect(result.sql).toBe('SELECT * FROM trn_accounting')
  })

  it('success with zero rows — returns no-data message', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      status: 'success',
      question: 'What are my sales?',
      sql: 'SELECT * FROM trn_accounting',
      columns: [],
      rows: [],
      rows_returned: 0,
      message: null,
      attempts: 1,
    }))

    const result = await processChatMessage('What are my sales?')

    expect(result.error).toBeUndefined()
    expect(result.answer).toContain('no data')
    expect(result.sql).toBe('SELECT * FROM trn_accounting')
  })

  it('non_sql — returns cannot-generate message', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      status: 'non_sql',
      question: 'Tell me a joke',
      sql: null,
      columns: null,
      rows: null,
      rows_returned: null,
      message: 'I could not generate a query for that question.',
      attempts: 1,
    }))

    const result = await processChatMessage('Tell me a joke')

    expect(result.error).toBeUndefined()
    expect(result.answer).toContain('could not generate')
    expect(result.sql).toBeUndefined()
  })

  it('max_retries — returns error with attempt count', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      status: 'max_retries',
      question: 'complex query',
      sql: 'SELECT broken',
      columns: null,
      rows: null,
      rows_returned: null,
      message: null,
      attempts: 3,
    }))

    const result = await processChatMessage('complex query')

    expect(result.error).toBe(true)
    expect(result.answer).toContain('3 attempt')
  })

  it('api_error — returns service unavailable message', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse({
      status: 'api_error',
      question: 'any question',
      sql: null,
      columns: null,
      rows: null,
      rows_returned: null,
      message: null,
      attempts: 0,
    }))

    const result = await processChatMessage('any question')

    expect(result.error).toBe(true)
    expect(result.answer).toContain('unavailable')
  })

  it('network failure — returns connection error message', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const result = await processChatMessage('any question')

    expect(result.error).toBe(true)
    expect(result.answer).toContain('connect')
  })

  it('HTTP error from service — returns HTTP error message', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse('Internal Server Error', 500))

    const result = await processChatMessage('any question')

    expect(result.error).toBe(true)
    expect(result.answer).toContain('500')
  })
})
