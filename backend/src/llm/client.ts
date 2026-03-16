import OpenAI from 'openai'
import { config } from '../config.js'

export const llmClient = new OpenAI({
  baseURL: config.LLM_BASE_URL,
  apiKey: 'lm-studio', // LM Studio ignores this value but the openai package requires it
})
