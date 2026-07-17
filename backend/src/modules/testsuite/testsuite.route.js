import express from 'express'
import {
  generateTestSuite,
  getTestSuiteByProjectId,
  updateTestSuite,
  toggleTestCaseRegressive,
  aiGenerateTestCase,
  aiUpdateTestCaseSteps
} from './testsuite.controller.js'
import { projectAccessMiddleware } from '../../middleware/projectAccess.js'

const router = express.Router()

router.post('/test-suites/generate/:projectId', projectAccessMiddleware, generateTestSuite)
router.post('/test-suites/ai-generate/:projectId', projectAccessMiddleware, aiGenerateTestCase)
router.post('/test-suites/ai-update-steps/:projectId', projectAccessMiddleware, aiUpdateTestCaseSteps)
router.get('/test-suites/:projectId', projectAccessMiddleware, getTestSuiteByProjectId)
router.put('/test-suites/:projectId/:suiteId', projectAccessMiddleware, updateTestSuite)
router.patch('/test-suites/:projectId/:suiteId/test-cases/:testCaseId/regressive', projectAccessMiddleware, toggleTestCaseRegressive)

export default router
