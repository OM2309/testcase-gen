import express from 'express'
import { generateTestSuite, getTestSuiteByProjectId, updateTestSuite, toggleTestCaseRegressive } from './testsuite.controller.js'
import { asyncHandler } from '../../utils/asyncHandler.js'

const router = express.Router()

router.post('/test-suites/generate/:projectId', generateTestSuite)
router.get('/test-suites/:projectId', asyncHandler(getTestSuiteByProjectId))
router.put('/test-suites/:projectId', asyncHandler(updateTestSuite))
router.patch('/test-suites/:projectId/test-cases/:testCaseId/regressive', asyncHandler(toggleTestCaseRegressive))

export default router
