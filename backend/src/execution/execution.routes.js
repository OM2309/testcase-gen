import express from 'express'
import { runExecution, streamExecutionEvents, getExecutionReport, getTestSuiteByProject } from './execution.controller.js'

const router = express.Router()

router.post('/execution/run', runExecution)
router.get('/stream/:runId', streamExecutionEvents)
router.get('/execution/:runId/report', getExecutionReport)
router.get('/project/:projectId/testsuite', getTestSuiteByProject)

export default router
