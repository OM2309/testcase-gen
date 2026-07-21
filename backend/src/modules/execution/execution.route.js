import express from 'express'
import {
  startExecutionHandler,
  getExecutionRunHandler,
  getProjectExecutionsHandler,
  getExecutionStatusHandler,
  cancelExecutionHandler,
} from './execution.controller.js'
import { projectAccessMiddleware } from '../../middleware/projectAccess.js'
import { validate } from '../../middlewares/validate.middleware.js'
import {
  startExecutionSchema,
  getExecutionRunSchema,
  getProjectExecutionsSchema,
} from '../../schemas/execution.schema.js'

const router = express.Router()

router.post('/executions/start', projectAccessMiddleware, validate(startExecutionSchema), startExecutionHandler)
router.get('/executions/project/:projectId', projectAccessMiddleware, validate(getProjectExecutionsSchema), getProjectExecutionsHandler)
router.get('/executions/:runId/status', validate(getExecutionRunSchema), getExecutionStatusHandler)
router.get('/executions/:runId', validate(getExecutionRunSchema), getExecutionRunHandler)
router.post('/executions/:runId/cancel', validate(getExecutionRunSchema), cancelExecutionHandler)

export default router
