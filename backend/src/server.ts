import Fastify from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'
import { config } from './config.js'
import { processChatMessage } from './routes/chat.js'

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
})

export async function buildServer(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: config.CORS_ORIGIN })

  app.post('/api/chat', async (request, reply) => {
    const parsed = chatRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.message })
    }

    const result = await processChatMessage(parsed.data.message)

    return reply.status(200).send(result)
  })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
