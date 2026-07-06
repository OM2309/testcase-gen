import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import env from './config/env.js'
import authRoutes from './modules/auth/auth.route.js'
import { authMiddleware } from './middleware/auth.js'
import projectRoutes from './modules/project/project.route.js'
import requirementRoutes from './modules/requirement/requirement.route.js'
import testsuiteRoutes from './modules/testsuite/testsuite.route.js'
import executionRoutes from './modules/execution/execution.route.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.use(cors({
  origin: env.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Static files
app.use('/public', express.static(path.join(__dirname, '../public')))

// Mount routes
app.use('/api', authRoutes)
app.use('/api', authMiddleware, projectRoutes)
app.use('/api', authMiddleware, requirementRoutes)
app.use('/api', authMiddleware, testsuiteRoutes)
app.use('/api', authMiddleware, executionRoutes)

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
  const status = err.status || 'error'

  res.status(statusCode).json({
    success: false,
    status,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

export default app
