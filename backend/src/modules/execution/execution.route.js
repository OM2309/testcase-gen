import express from 'express'
import { asyncHandler } from '../../utils/asyncHandler.js'
import {
  startExecutionHandler,
  getExecutionRunHandler,
  getProjectExecutionsHandler,
  getExecutionStatusHandler
} from './execution.controller.js'

const router = express.Router()

// Start a new test execution
router.post('/executions/start', asyncHandler(startExecutionHandler))

// Get execution history for a project (must come before :runId to avoid route collision)
router.get('/executions/project/:projectId', asyncHandler(getProjectExecutionsHandler))

// Get lightweight status for polling
router.get('/executions/:runId/status', asyncHandler(getExecutionStatusHandler))

// Get full execution run details
router.get('/executions/:runId', asyncHandler(getExecutionRunHandler))

export default router
