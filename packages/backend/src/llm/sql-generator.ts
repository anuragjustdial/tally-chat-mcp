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
    { role: 'user' as const, content: question },
  ]

  const response = await llmClient.chat.completions.create({
    model: config.LLM_MODEL,
    messages,
    max_tokens: config.LLM_MAX_TOKENS,
    temperature: config.LLM_TEMPERATURE,
  })

  const raw = response.choices[0]?.message?.content ?? ''
  return cleanSql(raw)
}

function cleanSql(raw: string): string {
  // Strip markdown code fences that LLMs sometimes add
  return raw
    .replace(/^```sql\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim()
}
