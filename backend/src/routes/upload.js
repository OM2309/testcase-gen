import express from 'express'
import upload from '../middleware/multerConfig.js'
import { uploadSRS } from '../controllers/uploadController.js'
import { getProjectStatus, getProjectAnalysis, getAllProjects, deleteProject } from '../controllers/projectController.js'
import { analyzePRD, generateTestCases } from '../controllers/agentController.js'
import { runExecution, streamExecutionEvents, getExecutionReport } from '../controllers/executionController.js'

const router = express.Router()

router.post('/upload', upload.single('srs'), uploadSRS)

router.get('/projects', getAllProjects)
router.get('/project/:id/status', getProjectStatus)
router.get('/project/:id/analysis', getProjectAnalysis)
router.delete('/project/:id', deleteProject)

router.post('/agent/analyze', analyzePRD)
router.post('/agent/testcases', generateTestCases)

router.post('/execution/run', runExecution)
router.get('/stream/:runId', streamExecutionEvents)
router.get('/execution/:runId/report', getExecutionReport)

export default router
