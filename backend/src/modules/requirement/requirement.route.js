import express from 'express'
import { generateRequirements, getRequirementsByProjectId } from './requirement.controller.js'

const router = express.Router()

router.post('/requirements/generate/:projectId', generateRequirements)
router.post('/requirements/generate/:projectId/:srsDocumentId', generateRequirements)
router.get('/requirements/:projectId', getRequirementsByProjectId)

export default router
