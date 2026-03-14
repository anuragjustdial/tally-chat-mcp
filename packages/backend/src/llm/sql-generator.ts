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
  // 1. Try to find a ```sql ... ``` code block anywhere in the response
  const fencedMatch = raw.match(/```sql\s*([\s\S]*?)```/i)
  if (fencedMatch) return fencedMatch[1].trim()

  // 2. Try plain ``` ... ``` block
  const plainFence = raw.match(/```\s*([\s\S]*?)```/)
  if (plainFence) {
    const inner = plainFence[1].trim()
    if (/^(SELECT|WITH)\s/i.test(inner)) return inner
  }

  // 3. Find the first SELECT or WITH statement (handles thinking-mode output)
  const selectIndex = raw.search(/\bSELECT\b/i)
  const withIndex = raw.search(/\bWITH\b/i)
  const startIndex = [selectIndex, withIndex]
    .filter(i => i >= 0)
    .reduce((a, b) => Math.min(a, b), Infinity)

  if (startIndex !== Infinity) {
    return raw.slice(startIndex).trim()
  }

  // 4. Fallback: return as-is trimmed
  return raw.trim()
}
