import app from './app.js'
import { connectDB } from './config/db.js'
import env from './config/env.js'

const PORT = env.port

connectDB()
  .then(() => {
    app.listen(PORT, () => {
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
