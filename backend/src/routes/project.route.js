import express from 'express'
import upload from '../middleware/multerConfig.js'
import { createProject, getProjects, getProjectById, deleteProject } from '../controllers/project.controller.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const router = express.Router()

router.post('/projects', upload.single('srs'), asyncHandler(createProject))
router.get('/projects', asyncHandler(getProjects))
router.get('/projects/:projectId', asyncHandler(getProjectById))
router.delete('/projects/:projectId', asyncHandler(deleteProject))

export default router
