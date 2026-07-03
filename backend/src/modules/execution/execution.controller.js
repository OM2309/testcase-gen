/**
 * Execution Controller
 * 
 * Handles HTTP requests for test execution endpoints.
 */

import { ApiError } from '../../utils/apiError.js'
import {
  startExecution,
  getExecutionRun,
  getProjectExecutions,
  getExecutionStatus
} from './execution.service.js'

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

    return res.status(201).json({
      success: true,
      runId,
      message: 'Execution started'
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/executions/:runId
 * Returns full execution run details (used for polling).
 */
export async function getExecutionRunHandler(req, res, next) {
  try {
    const { runId } = req.params

    const run = await getExecutionRun(runId)
    if (!run) throw new ApiError('Execution run not found', 404)

    return res.status(200).json({
      success: true,
      data: run
    })
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

    return res.status(200).json({
      success: true,
      data: executions
    })
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

    return res.status(200).json({
      success: true,
      data: status
    })
  } catch (err) {
    next(err)
  }
}
