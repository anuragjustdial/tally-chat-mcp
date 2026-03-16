import { llmClient } from './client.js'
import { buildSystemPrompt } from './schema-loader.js'
import { config } from '../config.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function generateSql(
  question: string,
  history: ChatMessage[]
): Promise<string> {
  const systemPrompt = await buildSystemPrompt() // cached after first call

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.slice(-6), // last 3 exchanges for context
    // /no_think disables Qwen3's chain-of-thought reasoning mode — returns SQL directly
    { role: 'user' as const, content: `/no_think\n${question}` },
  ]

  const response = await llmClient.chat.completions.create({
    model: config.LLM_MODEL,
    messages,
    max_tokens: config.LLM_MAX_TOKENS,
    temperature: config.LLM_TEMPERATURE,
  })

  const raw = response.choices[0]?.message?.content ?? ''
  // DEBUG: log raw LLM output to diagnose extraction issues
  process.stderr.write(`[LLM RAW]\n${raw}\n[/LLM RAW]\n`)
  return extractSql(raw)
}

/**
 * Extracts the SQL query from LLM response.
 * Handles:
 * - Qwen3 "thinking" mode: reasoning text followed by ```sql block
 * - Plain SQL with no fences
 * - SQL with leading/trailing ``` fences
 */
export function extractSql(raw: string): string {
  // Strip <think>...</think> blocks — Qwen3 sometimes ignores /no_think
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  // 1. Try to find a ```sql ... ``` code block anywhere in the response
  const fencedMatch = cleaned.match(/```sql\s*([\s\S]*?)```/i)
  if (fencedMatch) return stripTrailingSemicolon(fencedMatch[1].trim())

  // 2. Try plain ``` ... ``` block
  const plainFence = cleaned.match(/```\s*([\s\S]*?)```/)
  if (plainFence) {
    const inner = plainFence[1].trim()
    if (/^(SELECT|WITH)\s/i.test(inner)) return stripTrailingSemicolon(inner)
  }

  // 3. Find the first SELECT or WITH ... AS ( (CTE pattern only — avoids matching "with" in prose)
  const selectIndex = cleaned.search(/\bSELECT\b/i)
  const withCteIndex = cleaned.search(/\bWITH\b\s+\w+\s+AS\s*\(/i)
  const startIndex = [selectIndex, withCteIndex]
    .filter(i => i >= 0)
    .reduce((a, b) => Math.min(a, b), Infinity)

  if (startIndex !== Infinity) {
    return stripTrailingSemicolon(cleaned.slice(startIndex).trim())
  }

  // 4. Fallback: return as-is trimmed
  return stripTrailingSemicolon(cleaned.trim())
}

/** Strip trailing semicolons — a single trailing ';' is valid SQL but triggers multi-statement check */
function stripTrailingSemicolon(sql: string): string {
  return sql.replace(/;\s*$/, '')
}
