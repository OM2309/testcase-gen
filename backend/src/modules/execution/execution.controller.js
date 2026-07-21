import { ApiError } from '../../utils/apiError.js'
import { sendSuccess } from '../../utils/responseHelper.js'
import { projectRepository } from '../project/project.repository.js'
import {
  startExecution,
  getExecutionRun,
  getProjectExecutions,
  getExecutionStatus,
  cancelExecution,
} from './execution.service.js'

async function checkProjectAccess(req, projectId) {
  if (req.user.role === 'admin') return
  const project = await projectRepository.findById(projectId)
  if (!project) throw new ApiError('Associated project not found', 404)
  const isOwner = project.userId && project.userId.toString() === req.user.id
  const isAssigned = project.assignedUsers && project.assignedUsers.some((uid) => uid.toString() === req.user.id)
  if (!isOwner && !isAssigned) {
    throw new ApiError('Access denied. You do not have permission to access this project.', 403)
  }
}

export async function startExecutionHandler(req, res, next) {
  try {
    const { projectId, testSuiteId, baseUrl, headless, testCaseIds } = req.body

    const runId = await startExecution({
      projectId,
      testSuiteId,
      baseUrl,
      headless: headless !== false,
      testCaseIds: Array.isArray(testCaseIds) ? testCaseIds : null,
    })

    return sendSuccess(res, 'Execution started successfully.', {
      runId,
      message: 'Execution started',
    }, 201)
  } catch (err) {
    next(err)
  }
}

export async function getExecutionRunHandler(req, res, next) {
  try {
    const { runId } = req.params
    const run = await getExecutionRun(runId)
    if (!run) throw new ApiError('Execution run not found', 404)

    await checkProjectAccess(req, run.projectId)
    return sendSuccess(res, 'Execution run fetched successfully.', run)
  } catch (err) {
    next(err)
  }
}

export async function getProjectExecutionsHandler(req, res, next) {
  try {
    const { projectId } = req.params
    const executions = await getProjectExecutions(projectId)
    return sendSuccess(res, 'Project execution runs fetched successfully.', executions)
  } catch (err) {
    next(err)
  }
}

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
