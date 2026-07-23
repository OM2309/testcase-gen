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
  importJiraStories,
  connectLinear,
  getLinearIssues,
  importLinearStories,
  connectFigma,
  syncFigma,
} from './project.controller.js'
import { projectAccessMiddleware } from '../../middleware/projectAccess.js'
import { authorizeRoles } from '../../middleware/auth.js'
import { validate } from '../../middlewares/validate.middleware.js'
import {
  createProjectOnlySchema,
  updateProjectSchema,
  assignUsersSchema,
  connectJiraSchema,
  connectLinearSchema,
  connectFigmaSchema,
} from '../../schemas/project.schema.js'

const router = express.Router()

router.post('/projects/create', authorizeRoles('admin', 'project_manager'), validate(createProjectOnlySchema), createProjectOnly)
router.post('/projects', authorizeRoles('admin', 'project_manager'), upload.single('srs'), createProject)
router.post('/projects/:projectId/srs', projectAccessMiddleware, upload.single('srs'), addSrsToProject)

router.get('/projects', getProjects)
router.get('/projects/:projectId', projectAccessMiddleware, getProjectById)
router.put('/projects/:projectId', projectAccessMiddleware, validate(updateProjectSchema), updateProject)
router.delete('/projects/:projectId', projectAccessMiddleware, deleteProject)
router.put('/projects/:projectId/assign', projectAccessMiddleware, validate(assignUsersSchema), assignUsersToProject)
router.put('/projects/:projectId/jira-connect', projectAccessMiddleware, validate(connectJiraSchema), connectJira)
router.get('/projects/:projectId/jira-issues', projectAccessMiddleware, getJiraIssues)
router.post('/projects/:projectId/jira-import', projectAccessMiddleware, importJiraStories)
router.put('/projects/:projectId/linear-connect', projectAccessMiddleware, validate(connectLinearSchema), connectLinear)
router.get('/projects/:projectId/linear-issues', projectAccessMiddleware, getLinearIssues)
router.post('/projects/:projectId/linear-import', projectAccessMiddleware, importLinearStories)
router.put('/projects/:projectId/figma-connect', projectAccessMiddleware, validate(connectFigmaSchema), connectFigma)
router.post('/projects/:projectId/figma-sync', projectAccessMiddleware, syncFigma)

export default router
