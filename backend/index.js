import dotenv from 'dotenv'
dotenv.config({ override: true })

import openai from './src/config/openai.js'
import { setDefaultOpenAIClient } from '@openai/agents'

setDefaultOpenAIClient(openai)


import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './src/config/db.js'
import projectRoutes from './src/project/project.routes.js'
import agentRoutes from './src/agent/agent.routes.js'
import executionRoutes from './src/execution/execution.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use('/public', express.static(path.join(__dirname, 'public')))

app.use('/api', projectRoutes)
app.use('/api', agentRoutes)
app.use('/api', executionRoutes)

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

const PORT = process.env.PORT || 5000

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT}`)
      console.log(`[SERVER] Health check: http://localhost:${PORT}/health`)
    })
  })
  .catch((err) => {
    console.error(`[SERVER] Failed to start:`, err.message)
    process.exit(1)
  })

process.on('unhandledRejection', (reason) => {
  console.error('[PROCESS] Unhandled Rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('[PROCESS] Uncaught Exception:', err)
  process.exit(1)
})
