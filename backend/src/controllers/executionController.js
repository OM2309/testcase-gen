import ExecutionRun from '../models/ExecutionRun.js'
import TestSuite from '../models/TestSuite.js'
import { executeTestSuite } from '../services/execution/playwrightRunner.service.js'
import { eventBus } from '../services/stream/eventBus.service.js'
import { sendSuccess, sendError } from '../utils/responseHelper.js'

export async function runExecution(req, res) {
  const { suiteId, baseUrl, headless } = req.body

  if (!suiteId) {
    return sendError(res, 'suiteId is required', 400)
  }

  const base = baseUrl || 'http://localhost:3000'
  const isHeadless = headless !== undefined ? headless : true

  try {
    const suite = await TestSuite.findById(suiteId)
    if (!suite) {
      return sendError(res, 'TestSuite not found', 404)
    }

    const run = await ExecutionRun.create({
      suiteId,
      status: 'pending',
      summary: { total: suite.testCases?.length || 0, passed: 0, failed: 0, skipped: 0 }
    })

    executeTestSuite(run._id, suiteId, base, isHeadless).catch((err) => {
      console.error(`[Playwright Run] Background execution failed for run ${run._id}:`, err.message)
      ExecutionRun.findByIdAndUpdate(run._id, { status: 'failed' }).catch(() => {})
    })

    return sendSuccess(res, {
      runId: run._id,
      status: 'started'
    }, 202)

  } catch (err) {
    console.error('[Execution] Run launch failed:', err.message)
    return sendError(res, `Failed to start execution: ${err.message}`)
  }
}

export function streamExecutionEvents(req, res) {
  const { runId } = req.params

  if (!runId) {
    return sendError(res, 'runId is required', 400)
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })

  res.write(': sse connection active\n\n')

  const sseListener = (message) => {
    res.write(`data: ${message}\n\n`)
  }

  eventBus.addListener(runId, sseListener)
  console.log(`[SSE] Client connected to run stream: ${runId}`)

  req.on('close', () => {
    eventBus.removeListener(runId, sseListener)
    console.log(`[SSE] Client disconnected from run stream: ${runId}`)
  })
}

export async function getExecutionReport(req, res) {
  const { runId } = req.params

  if (!runId) {
    return sendError(res, 'runId is required', 400)
  }

  try {
    const report = await ExecutionRun.findById(runId)
    if (!report) {
      return sendError(res, 'Execution run report not found', 404)
    }

    return sendSuccess(res, {
      report
    })

  } catch (err) {
    console.error('[Report] Failed to fetch report:', err.message)
    return sendError(res, `Failed to retrieve execution report: ${err.message}`)
  }
}
