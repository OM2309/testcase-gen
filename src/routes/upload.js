import express from 'express'
import upload from '../middleware/multerConfig.js'
import { uploadSRS } from '../controllers/uploadController.js'
import { getProjectStatus, getProjectAnalysis, getProjectFiles, downloadProjectFiles, getAllProjects, deleteProject, viewProjectFile } from '../controllers/projectController.js'
import { getTestCases, getTestCaseSummary } from '../controllers/testCaseController.js'

const router = express.Router()

router.post('/upload', upload.single('srs'), uploadSRS)

router.get('/projects', getAllProjects)
router.get('/project/:id/status', getProjectStatus)
router.get('/project/:id/analysis', getProjectAnalysis)
router.get('/project/:id/testcases', getTestCases)
router.get('/project/:id/testcases/summary', getTestCaseSummary)
router.get('/project/:id/files', getProjectFiles)
router.get('/project/:id/download', downloadProjectFiles)
router.get('/project/:id/view-file', viewProjectFile)
router.delete('/project/:id', deleteProject)

export default router
