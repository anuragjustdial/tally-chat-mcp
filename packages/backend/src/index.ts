import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'

const app = Fastify({ logger: true })
await app.register(cors, { origin: config.CORS_ORIGIN })
app.get('/health', async () => ({ status: 'ok' }))

await app.listen({ port: config.PORT, host: '0.0.0.0' })
console.log(`Tally Chat backend running on port ${config.PORT}`)
