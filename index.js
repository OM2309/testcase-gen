import dotenv from 'dotenv'
dotenv.config({ override: true })

import OpenAI from 'openai'
import { setDefaultOpenAIClient } from '@openai/agents'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

setDefaultOpenAIClient(openai)


import express from 'express'
import serveIndex from 'serve-index'


import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './src/config/db.js'
import uploadRoute from './src/routes/upload.js'


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
app.use('/public', serveIndex(path.join(__dirname, 'public'), { icons: true }))

app.use('/api', uploadRoute)

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
