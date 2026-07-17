import express from 'express'
import upload from '../../middleware/multerConfig.js'
import {
  createProject,
  createProjectOnly,
  addSrsToProject,
  getProjects,
  getProjectById,
  deleteProject,
  assignUsersToProject,
  updateProject
} from './project.controller.js'
import { projectAccessMiddleware } from '../../middleware/projectAccess.js'

const router = express.Router()

router.post('/projects/create', createProjectOnly)
router.post('/projects', upload.single('srs'), createProject)
router.post('/projects/:projectId/srs', projectAccessMiddleware, upload.single('srs'), addSrsToProject)
router.get('/projects', getProjects)
router.get('/projects/:projectId', projectAccessMiddleware, getProjectById)
router.put('/projects/:projectId', projectAccessMiddleware, updateProject)
router.delete('/projects/:projectId', projectAccessMiddleware, deleteProject)
router.put('/projects/:projectId/assign', projectAccessMiddleware, assignUsersToProject)

export default router
