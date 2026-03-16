import { config } from '../config.js'
import { formatPythonResponse } from '../formatters/result.js'

export interface ChatResult {
  answer: string
  sql?: string
  error?: boolean
}

type PythonStatus = 'success' | 'non_sql' | 'max_retries' | 'api_error'

interface PythonServiceResponse {
  status: PythonStatus
  question: string
  sql: string | null
  columns: string[] | null
  rows: unknown[][] | null
  rows_returned: number | null
  message: string | null
  attempts: number
}

export async function processChatMessage(message: string): Promise<ChatResult> {
  let data: PythonServiceResponse

  try {
    const res = await fetch(`${config.PYTHON_SERVICE_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: message }),
    })

    if (!res.ok) {
      const text = await res.text()
      return {
        answer: `The query service returned an error (HTTP ${res.status}): ${text}`,
        error: true,
      }
    }

    data = (await res.json()) as PythonServiceResponse
  } catch {
    return {
      answer: 'Could not connect to the query service. Please ensure it is running.',
      error: true,
    }
  }

  switch (data.status) {
    case 'success':
      if (data.rows_returned && data.rows_returned > 0 && data.columns && data.rows) {
        return {
          answer: formatPythonResponse(data.columns, data.rows),
          sql: data.sql ?? undefined,
        }
      }
      return {
        answer: data.message ?? `I found no data for "${data.question}". This could mean there are no matching records in your Tally data for the selected period.`,
        sql: data.sql ?? undefined,
      }

    case 'non_sql':
      return {
        answer: data.message ?? 'I could not generate a query for that question.',
        sql: undefined,
      }

    case 'max_retries':
      return {
        answer: `Sorry, I wasn't able to answer "${data.question}". The query failed after ${data.attempts} attempt(s). Please try rephrasing your question.`,
        sql: data.sql ?? undefined,
        error: true,
      }

    case 'api_error':
      return {
        answer: 'The AI service is currently unavailable. Please try again in a moment.',
        error: true,
      }

    default:
      return {
        answer: 'An unexpected error occurred. Please try again.',
        error: true,
      }
  }
}
