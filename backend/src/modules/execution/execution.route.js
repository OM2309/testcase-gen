import express from 'express'
import {
  startExecutionHandler,
  getExecutionRunHandler,
  getProjectExecutionsHandler,
  getExecutionStatusHandler,
  cancelExecutionHandler
} from './execution.controller.js'

const router = express.Router()

router.post('/executions/start', startExecutionHandler)
router.get('/executions/project/:projectId', getProjectExecutionsHandler)
router.get('/executions/:runId/status', getExecutionStatusHandler)
router.get('/executions/:runId', getExecutionRunHandler)
router.post('/executions/:runId/cancel', cancelExecutionHandler)

export default router
