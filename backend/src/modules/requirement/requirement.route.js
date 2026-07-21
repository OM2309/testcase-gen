import express from 'express'
import {
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

router.post('/requirements/:projectId/generate', validate(generateRequirementsSchema), generateRequirements)
router.post('/requirements/:projectId/generate/:srsDocumentId', validate(generateRequirementsSchema), generateRequirements)
router.get('/requirements/:projectId', validate(getRequirementsSchema), getRequirementsByProjectId)
router.post('/requirements/:projectId/gap-fill', validate(gapFillSchema), generateGapFill)
router.post('/requirements/:projectId/gap-fill/:srsDocumentId', validate(gapFillSchema), generateGapFill)

export default router
