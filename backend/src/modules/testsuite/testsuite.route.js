import express from 'express'
import {
  generateTestSuite,
  getTestSuiteByProjectId,
  updateTestSuite,
  toggleTestCaseRegressive
} from './testsuite.controller.js'

const router = express.Router()

router.post('/test-suites/generate/:projectId', generateTestSuite)
router.get('/test-suites/:projectId', getTestSuiteByProjectId)
router.put('/test-suites/:projectId/:suiteId', updateTestSuite)
router.patch('/test-suites/:projectId/:suiteId/test-cases/:testCaseId/regressive', toggleTestCaseRegressive)

export default router
