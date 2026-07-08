import http from 'http'
import app from './app.js'
import { connectDB } from './config/db.js'
import env from './config/env.js'
import { initSocket } from './shared/socket.js'

const PORT = env.port
const server = http.createServer(app)

initSocket(server)

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT}`)
      console.log(`[SERVER] Health check: http://localhost:${PORT}/health`)
    })
  })
  .catch((err) => {
    console.error('[SERVER] Failed to start:', err.message)
    process.exit(1)
  })

process.on('unhandledRejection', (reason) => {
  console.error('[PROCESS] Unhandled Rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('[PROCESS] Uncaught Exception:', err)
  process.exit(1)
})
