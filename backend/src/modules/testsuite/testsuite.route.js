import express from 'express'
import {
  generateTestSuite,
  getTestSuiteByProjectId,
  updateTestSuite,
  toggleTestCaseRegressive,
  aiGenerateTestCase,
  aiUpdateTestCaseSteps,
  requestApproval,
  submitReview,
  resolveRejectionFeedback,
  aiResolveRejectionFeedback,
} from './testsuite.controller.js'
import { validate } from '../../middlewares/validate.middleware.js'
import {
  generateTestSuiteSchema,
  getTestSuiteSchema,
  updateTestSuiteSchema,
  toggleTestCaseRegressiveSchema,
  aiGenerateTestCaseSchema,
  aiUpdateTestCaseStepsSchema,
  requestApprovalSchema,
  submitReviewSchema,
  resolveRejectionFeedbackSchema,
  aiResolveRejectionFeedbackSchema,
} from '../../schemas/testsuite.schema.js'

const router = express.Router()

// Agent 2 - Test Suite Generation
router.post('/testsuite/:projectId/generate', validate(generateTestSuiteSchema), generateTestSuite)
router.post('/test-suites/generate/:projectId', validate(generateTestSuiteSchema), generateTestSuite)
router.post('/testsuite/generate/:projectId', validate(generateTestSuiteSchema), generateTestSuite)

// Get Test Suite
router.get('/testsuite/:projectId', validate(getTestSuiteSchema), getTestSuiteByProjectId)
router.get('/test-suites/:projectId', validate(getTestSuiteSchema), getTestSuiteByProjectId)

// Update Test Suite
router.put('/testsuite/:projectId/:suiteId', validate(updateTestSuiteSchema), updateTestSuite)
router.put('/test-suites/:projectId/:suiteId', validate(updateTestSuiteSchema), updateTestSuite)

// Toggle Regressive Status
router.patch('/testsuite/:projectId/:suiteId/testcase/:testCaseId/toggle-regressive', validate(toggleTestCaseRegressiveSchema), toggleTestCaseRegressive)
router.patch('/test-suites/:projectId/:suiteId/test-cases/:testCaseId/regressive', validate(toggleTestCaseRegressiveSchema), toggleTestCaseRegressive)

// AI Single Test Case Generation
router.post('/testsuite/:projectId/ai-generate', validate(aiGenerateTestCaseSchema), aiGenerateTestCase)
router.post('/test-suites/ai-generate/:projectId', validate(aiGenerateTestCaseSchema), aiGenerateTestCase)

// AI Update Test Case Steps
router.post('/testsuite/:projectId/ai-update-steps', validate(aiUpdateTestCaseStepsSchema), aiUpdateTestCaseSteps)
router.post('/test-suites/ai-update-steps/:projectId', validate(aiUpdateTestCaseStepsSchema), aiUpdateTestCaseSteps)

// Approvals & Reviews
router.post('/testsuite/:projectId/:suiteId/request-approval', validate(requestApprovalSchema), requestApproval)
router.post('/test-suites/:projectId/:suiteId/request-approval', validate(requestApprovalSchema), requestApproval)
router.post('/testsuite/:projectId/:suiteId/review', validate(submitReviewSchema), submitReview)
router.post('/test-suites/:projectId/:suiteId/review', validate(submitReviewSchema), submitReview)

// Resolve Rejection Feedback
router.patch('/testsuite/:projectId/:suiteId/resolve-feedback', validate(resolveRejectionFeedbackSchema), resolveRejectionFeedback)
router.patch('/test-suites/:projectId/:suiteId/resolve-feedback', validate(resolveRejectionFeedbackSchema), resolveRejectionFeedback)

// AI Resolve Rejection Feedback
router.post('/testsuite/:projectId/:suiteId/ai-resolve-feedback', validate(aiResolveRejectionFeedbackSchema), aiResolveRejectionFeedback)
router.post('/test-suites/:projectId/:suiteId/ai-resolve-feedback', validate(aiResolveRejectionFeedbackSchema), aiResolveRejectionFeedback)

export default router
