import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  DB_TYPE: z.enum(['postgres', 'mysql']).default('postgres'),
  DATABASE_URL: z.string().min(1),
  LLM_BASE_URL: z.string().url(),
  LLM_MODEL: z.string().min(1),
  LLM_MAX_TOKENS: z.coerce.number().default(1024),
  LLM_TEMPERATURE: z.coerce.number().default(0.1),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  PYTHON_SERVICE_URL: z.string().url().default('http://localhost:8001'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  throw new Error(`Invalid configuration:\n${parsed.error.message}`)
}

export const config = parsed.data
