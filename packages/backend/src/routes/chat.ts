import { generateSql, type ChatMessage } from '../llm/sql-generator.js'
import { validateSql, SqlValidationError } from '../sql-safety/validator.js'
import { rawQuery } from '../db/kysely.js'
import { formatRows } from '../formatters/result.js'

export interface ChatResult {
  answer: string
  sql?: string
  error?: boolean
}

export async function processChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<ChatResult> {
  let sql: string
  try {
    sql = await generateSql(message, history)
  } catch (e) {
    return {
      answer: 'Sorry, I could not connect to the AI model. Please ensure LM Studio is running.',
      error: true,
    }
  }

  try {
    validateSql(sql)
  } catch (e) {
    if (e instanceof SqlValidationError) {
      return {
        answer: `I could not generate a safe query for that question. (${e.message})`,
        sql,
        error: true,
      }
    }
    throw e
  }

  let rows: Record<string, unknown>[]
  try {
    rows = await rawQuery(sql)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      answer: `The query could not be executed: ${msg}`,
      sql,
      error: true,
    }
  }

  return {
    answer: formatRows(rows),
    sql,
  }
}
