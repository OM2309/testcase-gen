import express from 'express'
import upload from '../middleware/multerConfig.js'
import {
  uploadSRS,
  getAllProjects,
  getProjectStatus,
  getProjectAnalysis,
  deleteProject
} from './project.controller.js'

const router = express.Router()

router.post('/upload', upload.single('srs'), uploadSRS)
router.get('/projects', getAllProjects)
router.get('/project/:id/status', getProjectStatus)
router.get('/project/:id/analysis', getProjectAnalysis)
router.delete('/project/:id', deleteProject)

export default router
