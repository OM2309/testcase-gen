import express from 'express'
import { generateRequirements, getRequirementsByProjectId, generateGapFill } from './requirement.controller.js'

const router = express.Router()

router.post('/requirements/generate/:projectId', generateRequirements)
router.post('/requirements/generate/:projectId/:srsDocumentId', generateRequirements)
router.post('/requirements/gap-fill/:projectId/:srsDocumentId', generateGapFill)
router.post('/requirements/gap-fill/:projectId', generateGapFill)
router.get('/requirements/:projectId', getRequirementsByProjectId)

export default router

