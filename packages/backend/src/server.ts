import Fastify from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'
import { config } from './config.js'
import { processChatMessage } from './routes/chat.js'
import type { ChatMessage } from './llm/sql-generator.js'

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .default([]),
})

export async function buildServer(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: config.CORS_ORIGIN })

  app.post('/api/chat', async (request, reply) => {
    const parsed = chatRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message })
    }

    const { message, history } = parsed.data
    const result = await processChatMessage(message, history as ChatMessage[])

    return reply.status(result.error ? 200 : 200).send(result)
  })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
