import express from 'express'
import { generateRequirements, getRequirementsByProjectId, generateGapFill } from './requirement.controller.js'
import { projectAccessMiddleware } from '../../middleware/projectAccess.js'

const router = express.Router()

router.post('/requirements/generate/:projectId', projectAccessMiddleware, generateRequirements)
router.post('/requirements/generate/:projectId/:srsDocumentId', projectAccessMiddleware, generateRequirements)
router.post('/requirements/gap-fill/:projectId/:srsDocumentId', projectAccessMiddleware, generateGapFill)
router.post('/requirements/gap-fill/:projectId', projectAccessMiddleware, generateGapFill)
router.get('/requirements/:projectId', projectAccessMiddleware, getRequirementsByProjectId)

export default router

