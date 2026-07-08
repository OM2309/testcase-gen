import express from 'express'
import upload from '../../middleware/multerConfig.js'
import {
  createProject,
  createProjectOnly,
  addSrsToProject,
  getProjects,
  getProjectById,
  deleteProject
} from './project.controller.js'

const router = express.Router()

router.post('/projects/create', createProjectOnly)
router.post('/projects', upload.single('srs'), createProject)
router.post('/projects/:projectId/srs', upload.single('srs'), addSrsToProject)
router.get('/projects', getProjects)
router.get('/projects/:projectId', getProjectById)
router.delete('/projects/:projectId', deleteProject)

export default router
