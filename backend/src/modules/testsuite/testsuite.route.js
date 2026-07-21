import express from 'express'
import {
  generateTestSuite,
  getTestSuiteByProjectId,
  updateTestSuite,
  toggleTestCaseRegressive,
  aiGenerateTestCase,
  aiUpdateTestCaseSteps,
} from './testsuite.controller.js'
import { validate } from '../../middlewares/validate.middleware.js'
import {
  generateTestSuiteSchema,
  getTestSuiteSchema,
  updateTestSuiteSchema,
  toggleTestCaseRegressiveSchema,
  aiGenerateTestCaseSchema,
  aiUpdateTestCaseStepsSchema,
} from '../../schemas/testsuite.schema.js'

const router = express.Router()

router.post('/testsuite/:projectId/generate', validate(generateTestSuiteSchema), generateTestSuite)
router.get('/testsuite/:projectId', validate(getTestSuiteSchema), getTestSuiteByProjectId)
router.put('/testsuite/:projectId/:suiteId', validate(updateTestSuiteSchema), updateTestSuite)
router.patch('/testsuite/:projectId/:suiteId/testcase/:testCaseId/toggle-regressive', validate(toggleTestCaseRegressiveSchema), toggleTestCaseRegressive)
router.post('/testsuite/:projectId/ai-generate', validate(aiGenerateTestCaseSchema), aiGenerateTestCase)
router.post('/testsuite/:projectId/ai-update-steps', validate(aiUpdateTestCaseStepsSchema), aiUpdateTestCaseSteps)

export default router
