import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './modules/auth/auth.route.js'
import { googleCallback } from './modules/auth/auth.controller.js'
import { authMiddleware } from './middleware/auth.js'
import projectRoutes from './modules/project/project.route.js'
import requirementRoutes from './modules/requirement/requirement.route.js'
import testsuiteRoutes from './modules/testsuite/testsuite.route.js'
import executionRoutes from './modules/execution/execution.route.js'
import inspectorRoutes from './modules/inspector/inspector.route.js'
import testfileRoutes from './modules/execution/testfile.route.js'
import { sendError } from './utils/responseHelper.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(cors({
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Static files
app.use('/public', express.static(path.join(__dirname, '../public')))

// Root/Callback routes
app.get('/auth/google/callback', googleCallback)

// Mount routes
app.use('/api', authRoutes)
app.use('/api', authMiddleware, projectRoutes)
app.use('/api', authMiddleware, requirementRoutes)
app.use('/api', authMiddleware, testsuiteRoutes)
app.use('/api', authMiddleware, executionRoutes)
app.use('/api', authMiddleware, inspectorRoutes)
app.use('/api', authMiddleware, testfileRoutes)

// Serve screenshots from uploads/test-runs
app.use('/uploads/test-runs', express.static(path.join(__dirname, '../uploads/test-runs')))

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

// Centralized error handling
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'
  const details = process.env.NODE_ENV === 'development' ? { stack: err.stack } : null

  return sendError(res, message, statusCode, details)
})

export default app
