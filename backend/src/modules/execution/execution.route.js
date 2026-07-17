import express from 'express'
import {
  startExecutionHandler,
  getExecutionRunHandler,
  getProjectExecutionsHandler,
  getExecutionStatusHandler,
  cancelExecutionHandler
} from './execution.controller.js'
import { projectAccessMiddleware } from '../../middleware/projectAccess.js'

const router = express.Router()

router.post('/executions/start', projectAccessMiddleware, startExecutionHandler)
router.get('/executions/project/:projectId', projectAccessMiddleware, getProjectExecutionsHandler)
router.get('/executions/:runId/status', getExecutionStatusHandler)
router.get('/executions/:runId', getExecutionRunHandler)
router.post('/executions/:runId/cancel', cancelExecutionHandler)

export default router
