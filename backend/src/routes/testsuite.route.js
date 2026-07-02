import express from 'express'
import { generateTestSuite, getTestSuiteByProjectId, updateTestSuite } from '../controllers/testsuite.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = express.Router()

router.post('/test-suites/generate/:projectId', asyncHandler(generateTestSuite))
router.get('/test-suites/:projectId', asyncHandler(getTestSuiteByProjectId))
router.put('/test-suites/:projectId', asyncHandler(updateTestSuite))

export default router
