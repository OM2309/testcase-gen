import express from 'express'
import { generateRequirements, getRequirementsByProjectId } from '../controllers/requirement.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = express.Router()

router.post('/requirements/generate/:projectId', asyncHandler(generateRequirements))
router.get('/requirements/:projectId', asyncHandler(getRequirementsByProjectId))

export default router
