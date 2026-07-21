/**
 * Execution Controller
 * 
 * Handles HTTP requests for test execution endpoints.
 */

import { ApiError } from '../../utils/apiError.js'
import { sendSuccess } from '../../utils/responseHelper.js'
import Project from '../project/project.model.js'
import {
  startExecution,
  getExecutionRun,
  getProjectExecutions,
  getExecutionStatus,
  cancelExecution
} from './execution.service.js'

async function checkProjectAccess(req, projectId) {
  if (req.user.role === 'admin') return;
  const project = await Project.findById(projectId)
  if (!project) throw new ApiError('Associated project not found', 404)
  const isOwner = project.userId && project.userId.toString() === req.user.id
  const isAssigned = project.assignedUsers && project.assignedUsers.some(uid => uid.toString() === req.user.id)
  if (!isOwner && !isAssigned) {
    throw new ApiError('Access denied. You do not have permission to access this project.', 403)
  }
}

/**
 * POST /api/executions/start
 * Starts a new test execution run.
 */
export async function startExecutionHandler(req, res, next) {
  try {
    const { projectId, testSuiteId, baseUrl, headless, testCaseIds } = req.body

    if (!projectId) throw new ApiError('projectId is required', 400)
    if (!testSuiteId) throw new ApiError('testSuiteId is required', 400)
    if (!baseUrl) throw new ApiError('baseUrl is required', 400)

    const runId = await startExecution({
      projectId,
      testSuiteId,
      baseUrl,
      headless: headless !== false, // default to true
      testCaseIds: Array.isArray(testCaseIds) ? testCaseIds : null
    })

    return sendSuccess(res, 'Execution started successfully.', {
      runId,
      message: 'Execution started'
    }, 201)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/executions/:runId
 * Returns full execution run details (used for polling/socket room initialization).
 */
export async function getExecutionRunHandler(req, res, next) {
  try {
    const { runId } = req.params;


    const run = await getExecutionRun(runId)
    if (!run) throw new ApiError('Execution run not found', 404)

    await checkProjectAccess(req, run.projectId)

    return sendSuccess(res, 'Execution run fetched successfully.', run)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/executions/project/:projectId
 * Returns execution history for a project.
 */
export async function getProjectExecutionsHandler(req, res, next) {
  try {
    const { projectId } = req.params

    const executions = await getProjectExecutions(projectId)

    return sendSuccess(res, 'Project execution runs fetched successfully.', executions)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/executions/:runId/status
 * Returns lightweight status for efficient polling.
 */
export async function getExecutionStatusHandler(req, res, next) {
  try {
    const { runId } = req.params

    const status = await getExecutionStatus(runId)
    if (!status) throw new ApiError('Execution run not found', 404)

    await checkProjectAccess(req, status.projectId)

    return sendSuccess(res, 'Execution status fetched successfully.', status)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/executions/:runId/cancel
 * Cancels a running execution.
 */
export async function cancelExecutionHandler(req, res, next) {
  try {
    const { runId } = req.params
    const run = await getExecutionRun(runId)
    if (!run) throw new ApiError('Execution run not found', 404)

    await checkProjectAccess(req, run.projectId)

    const cancelled = await cancelExecution(runId)
    return sendSuccess(res, 'Execution cancelled successfully.', { cancelled })
  } catch (err) {
    next(err)
  }
}
