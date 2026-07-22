import express from 'express'
import {
  analyzeScore,
  generateRequirements,
  getRequirementsByProjectId,
  generateGapFill,
} from './requirement.controller.js'
import { validate } from '../../middlewares/validate.middleware.js'
import {
  generateRequirementsSchema,
  getRequirementsSchema,
  gapFillSchema,
} from '../../schemas/requirement.schema.js'

const router = express.Router()

// Agent 0 - Accuracy Score & Rating
router.post('/requirements/:projectId/analyze-score', validate(generateRequirementsSchema), analyzeScore)
router.post('/requirements/:projectId/analyze-score/:srsDocumentId', validate(generateRequirementsSchema), analyzeScore)
router.post('/requirements/analyze-score/:projectId', validate(generateRequirementsSchema), analyzeScore)
router.post('/requirements/analyze-score/:projectId/:srsDocumentId', validate(generateRequirementsSchema), analyzeScore)

// Agent 1 - Requirement Generation (Module Extraction)
router.post('/requirements/:projectId/generate', validate(generateRequirementsSchema), generateRequirements)
router.post('/requirements/:projectId/generate/:srsDocumentId', validate(generateRequirementsSchema), generateRequirements)
router.post('/requirements/generate/:projectId', validate(generateRequirementsSchema), generateRequirements)
router.post('/requirements/generate/:projectId/:srsDocumentId', validate(generateRequirementsSchema), generateRequirements)

// Get Requirements
router.get('/requirements/:projectId', validate(getRequirementsSchema), getRequirementsByProjectId)

// Gap Fill Analysis
router.post('/requirements/:projectId/gap-fill', validate(gapFillSchema), generateGapFill)
router.post('/requirements/:projectId/gap-fill/:srsDocumentId', validate(gapFillSchema), generateGapFill)
router.post('/requirements/gap-fill/:projectId', validate(gapFillSchema), generateGapFill)
router.post('/requirements/gap-fill/:projectId/:srsDocumentId', validate(gapFillSchema), generateGapFill)

export default router
