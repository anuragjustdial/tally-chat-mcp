import { buildServer } from './server.js'
import { config } from './config.js'

const app = await buildServer()
await app.listen({ port: config.PORT, host: '0.0.0.0' })
console.log(`Tally Chat backend running on port ${config.PORT}`)
