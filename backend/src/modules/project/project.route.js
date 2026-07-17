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
  updateProject,
  connectJira,
  getJiraIssues,
  importJiraStories
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
router.put('/projects/:projectId/jira-connect', projectAccessMiddleware, connectJira)
router.get('/projects/:projectId/jira-issues', projectAccessMiddleware, getJiraIssues)
router.post('/projects/:projectId/jira-import', projectAccessMiddleware, importJiraStories)

export default router
