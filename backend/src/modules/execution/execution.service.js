/**
 * Execution Service (Agent 3 Core)
 * 
 * Orchestrates test suite execution using Playwright.
 * Persists progress to MongoDB continuously for frontend polling.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'
import TestRun from './execution.model.js'
import TestSuite from '../testsuite/testsuite.model.js'
import Project from '../project/project.model.js'
import { executeStep, captureFailureScreenshot } from './stepExecutor.service.js'
import { getSocketIO } from '../../shared/socket.js'
import { compareDesign } from './designMatcher.service.js'

const activeRuns = new Map()

async function updateTestRun(runId, updateDoc) {
  const run = await TestRun.findByIdAndUpdate(runId, updateDoc, { new: true }).lean()
  const io = getSocketIO()
  if (io && run) {
    io.to(`run:${runId}`).emit('run-update', run)
  }
  return run
}


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads/test-runs')

/**
 * Launches Chromium for a run.
 *
 * Tries Playwright's bundled Chromium first. If those browser binaries were
 * never downloaded (common on fresh machines / offline boxes), it falls back
 * to a system-installed Google Chrome via `channel: 'chrome'`, or an explicit
 * executable path from the PLAYWRIGHT_CHROME_PATH env var.
 */
async function launchBrowser(headless) {
  const explicitPath = process.env.PLAYWRIGHT_CHROME_PATH

  if (explicitPath) {
    return chromium.launch({ headless, executablePath: explicitPath })
  }

  try {
    return await chromium.launch({ headless })
  } catch (err) {
    const missing = /Executable doesn't exist|Failed to launch|ENOENT/i.test(err?.message || '')
    if (!missing) throw err
    // Bundled browser not installed — use the system Chrome instead.
    return chromium.launch({ headless, channel: 'chrome' })
  }
}

/**
 * Creates a TestRun record and starts async execution.
 * Returns the runId immediately so the API can respond fast.
 */
export async function startExecution({ projectId, testSuiteId, baseUrl, headless = true, testCaseIds = null }) {
  // Load test suite
  const testSuite = await TestSuite.findById(testSuiteId)
  if (!testSuite) throw new Error('Test suite not found')

  // Block execution if test suite is not approved
  if (testSuite.approvalStatus !== 'approved') {
    throw new Error('Test suite must be approved before execution. Current status: ' + (testSuite.approvalStatus || 'draft'))
  }

  const project = await Project.findById(projectId)
  if (!project) throw new Error('Project not found')

  // Optionally run only a subset of test cases (single/selected run).
  let cases = testSuite.testCases
  if (Array.isArray(testCaseIds) && testCaseIds.length > 0) {
    const idSet = new Set(testCaseIds)
    const filtered = cases.filter(tc => idSet.has(tc.id))
    if (filtered.length > 0) cases = filtered
  }

  // Build initial test case results (all pending)
  const testCaseResults = cases.map(tc => ({
    testCaseId: tc.id,
    title: tc.title,
    module: tc.module || '',
    feature: tc.feature || '',
    status: 'pending',
    figmaFrameId: tc.figmaFrameId || '',
    stepResults: tc.steps.map(step => ({
      stepNumber: step.step_number,
      action: step.action,
      target: step.target || '',
      value: step.value || '',
      expectedUrl: step.expected_url || '',
      expectedText: step.expected_text || '',
      status: 'pending'
    }))
  }))

  // Create TestRun record
  const run = await TestRun.create({
    projectId,
    testSuiteId,
    suiteName: testSuite.suiteName || 'Test Suite',
    projectName: project.projectName || '',
    status: 'queued',
    totalTests: cases.length,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    runConfig: { baseUrl, headless },
    testCaseResults,
    executionLogs: [{
      timestamp: new Date(),
      level: 'info',
      type: 'system',
      message: testCaseIds && testCaseIds.length > 0
        ? `Execution queued (${cases.length} selected test case${cases.length > 1 ? 's' : ''})`
        : 'Execution queued'
    }]
  })

  activeRuns.set(run._id.toString(), { browser: null, cancelRequested: false })

  // Start execution asynchronously (fire and forget)
  runExecution(run._id.toString()).catch(err => {
    console.error('[EXECUTION SERVICE] Unhandled execution error:', err.message)
  })

  return run._id.toString()
}

/**
 * Main execution loop - launches browser and runs all test cases.
 */
async function runExecution(runId) {
  let browser = null

  try {
    const run = await TestRun.findById(runId)
    if (!run) throw new Error('TestRun not found')

    const { baseUrl, headless } = run.runConfig

    // Mark run as running
    await updateTestRun(runId, {
      status: 'running',
      startedAt: new Date()
    })

    await appendLog(runId, 'info', 'system', 'Execution started')

    const activeRun = activeRuns.get(runId)
    if (!activeRun || activeRun.cancelRequested) {
      throw new Error('Execution cancelled by user')
    }

    // Launch browser (bundled Chromium, or system Chrome as a fallback)
    browser = await launchBrowser(headless)
    activeRun.browser = browser

    if (activeRun.cancelRequested) {
      throw new Error('Execution cancelled by user')
    }

    await appendLog(runId, 'info', 'system', `Browser launched (headless: ${headless})`)

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    })
    const page = await context.newPage()

    // Screenshot directory for this run
    const screenshotDir = path.join(UPLOADS_DIR, runId)

    let passedTests = 0
    let failedTests = 0

    // Execute each test case
    for (let i = 0; i < run.testCaseResults.length; i++) {
      const currentActiveRun = activeRuns.get(runId)
      if (!currentActiveRun || currentActiveRun.cancelRequested) {
        throw new Error('Execution cancelled by user')
      }
      const tcResult = run.testCaseResults[i]

      await runSingleTestCase({
        runId,
        testCaseIndex: i,
        testCase: tcResult,
        page,
        baseUrl,
        screenshotDir
      })

      // Reload run to get updated status
      const updatedRun = await TestRun.findById(runId)
      const updatedTc = updatedRun.testCaseResults[i]

      if (updatedTc.status === 'passed') passedTests++
      else if (updatedTc.status === 'failed') failedTests++

      // Update summary counts live
      await updateTestRun(runId, {
        passedTests,
        failedTests
      })
    }

    // Finalize run
    await finalizeRun(runId, 'completed')

  } catch (error) {
    console.error('[EXECUTION SERVICE] Run failed:', error.message)
    const missingBrowser = /Executable doesn't exist|Failed to launch|ENOENT/i.test(error?.message || '')
    const friendly = missingBrowser
      ? 'No Chromium/Chrome browser available. Install Playwright browsers with "npx playwright install chromium" in the backend, or install Google Chrome, or set PLAYWRIGHT_CHROME_PATH.'
      : `Execution error: ${error.message}`
    await appendLog(runId, 'error', 'system', friendly)
    await finalizeRun(runId, 'failed')
  } finally {
    activeRuns.delete(runId)
    if (browser) {
      try { await browser.close() } catch (e) { /* ignore */ }
    }
    await appendLog(runId, 'info', 'system', 'Browser closed')
  }
}

/**
 * Executes a single test case's steps sequentially.
 */
async function runSingleTestCase({ runId, testCaseIndex, testCase, page, baseUrl, screenshotDir }) {
  const { testCaseId, title } = testCase
  const tcStartTime = Date.now()

  // Mark test case as running
  await updateTestRun(runId, {
    [`testCaseResults.${testCaseIndex}.status`]: 'running',
    [`testCaseResults.${testCaseIndex}.startedAt`]: new Date(),
    currentTestCaseId: testCaseId,
    currentTestCaseTitle: title
  })

  await appendLog(runId, 'info', 'testcase', `Running: ${title}`, testCaseId)

  let failed = false
  let failedStepNumber = null
  let errorMessage = ''
  let screenshotPath = ''

  // Get the step results for this test case
  const run = await TestRun.findById(runId)
  const steps = run.testCaseResults[testCaseIndex].stepResults

  for (let stepIdx = 0; stepIdx < steps.length; stepIdx++) {
    const currentActiveRun = activeRuns.get(runId)
    if (!currentActiveRun || currentActiveRun.cancelRequested) {
      throw new Error('Execution cancelled by user')
    }
    const step = steps[stepIdx]
    const stepStart = Date.now()

    // Mark step running
    await updateTestRun(runId, {
      [`testCaseResults.${testCaseIndex}.stepResults.${stepIdx}.status`]: 'running',
      [`testCaseResults.${testCaseIndex}.stepResults.${stepIdx}.startedAt`]: new Date(),
      currentStepNumber: step.stepNumber,
      currentStepAction: step.action
    })

    await appendLog(runId, 'info', 'step', `Step ${step.stepNumber}: ${step.action} ${step.target || step.value || ''}`, testCaseId, step.stepNumber)

    // Execute the step
    const result = await executeStep({
      page,
      step: {
        action: step.action,
        target: step.target,
        value: step.value,
        stepNumber: step.stepNumber,
        expectedUrl: step.expectedUrl,
        expectedText: step.expectedText
      },
      baseUrl,
      screenshotDir
    })

    const stepDuration = Date.now() - stepStart

    if (result.success) {
      // Mark step passed
      await updateTestRun(runId, {
        [`testCaseResults.${testCaseIndex}.stepResults.${stepIdx}.status`]: 'passed',
        [`testCaseResults.${testCaseIndex}.stepResults.${stepIdx}.completedAt`]: new Date(),
        [`testCaseResults.${testCaseIndex}.stepResults.${stepIdx}.durationMs`]: stepDuration
      })

      await appendLog(runId, 'success', 'step', `Step ${step.stepNumber} passed (${stepDuration}ms)`, testCaseId, step.stepNumber)
    } else {
      // Mark step failed
      await updateTestRun(runId, {
        [`testCaseResults.${testCaseIndex}.stepResults.${stepIdx}.status`]: 'failed',
        [`testCaseResults.${testCaseIndex}.stepResults.${stepIdx}.completedAt`]: new Date(),
        [`testCaseResults.${testCaseIndex}.stepResults.${stepIdx}.durationMs`]: stepDuration,
        [`testCaseResults.${testCaseIndex}.stepResults.${stepIdx}.errorMessage`]: result.errorMessage
      })

      await appendLog(runId, 'error', 'step', `Step ${step.stepNumber} failed: ${result.errorMessage}`, testCaseId, step.stepNumber)

      failed = true
      failedStepNumber = step.stepNumber
      errorMessage = result.errorMessage

      // Capture failure screenshot
      const screenshotFilename = `${testCaseId}-step${step.stepNumber}-failed.png`
      const savedPath = await captureFailureScreenshot(page, screenshotDir, screenshotFilename)
      // Store a web-servable URL path (served via app.js static mount) instead of an absolute FS path
      screenshotPath = savedPath ? `/uploads/test-runs/${runId}/${screenshotFilename}` : ''

      // Break out of steps on first failure
      break
    }
  }

  // Visual Design Compliance Match
  if (!failed && testCase.figmaFrameId) {
    try {
      await appendLog(runId, 'info', 'step', `Running visual compliance check against Figma...`, testCaseId)
      const project = await Project.findById(run.projectId)
      const frame = project?.figmaSyncedFrames?.find(f => f.id === testCase.figmaFrameId)

      if (frame && frame.imageUrl) {
        const screenshotFilename = `${testCaseId}-design-actual.png`
        fs.mkdirSync(screenshotDir, { recursive: true })
        const actualScreenshotPath = path.join(screenshotDir, screenshotFilename)

        await page.screenshot({ path: actualScreenshotPath, fullPage: true })

        const diffFilename = `${testCaseId}-design-diff.png`
        const matchResult = await compareDesign({
          actualScreenshotPath,
          figmaFrameImageUrl: frame.imageUrl,
          frameName: frame.name,
          outputDir: screenshotDir,
          diffFilename
        })

        const webScreenshotPath = `/uploads/test-runs/${runId}/${screenshotFilename}`
        const webDiffPath = matchResult.visualDiffPath ? `/uploads/test-runs/${runId}/${diffFilename}` : ''

        // Save result and diff paths to the testCaseResults
        await updateTestRun(runId, {
          [`testCaseResults.${testCaseIndex}.designMatchResult`]: {
            status: matchResult.status,
            similarityScore: matchResult.similarityScore,
            visualDiffPath: webDiffPath,
            discrepancies: matchResult.discrepancies,
            completedAt: new Date()
          }
        })
        screenshotPath = webScreenshotPath

        if (matchResult.status === 'mismatch') {
          failed = true
          errorMessage = `Visual design mismatch (${matchResult.similarityScore}% similarity): ${matchResult.discrepancies.join(', ')}`
          await appendLog(runId, 'error', 'step', errorMessage, testCaseId)
        } else {
          await appendLog(runId, 'success', 'step', `Design match check passed (${matchResult.similarityScore}% similarity)`, testCaseId)
        }
      } else {
        await appendLog(runId, 'error', 'step', `Figma design image not found for compliance check`, testCaseId)
      }
    } catch (matchErr) {
      console.error('[EXECUTION SERVICE] Visual compliance check failed:', matchErr)
      await appendLog(runId, 'error', 'step', `Visual compliance check failed: ${matchErr.message}`, testCaseId)
    }
  }

  const tcDuration = Date.now() - tcStartTime
  const tcStatus = failed ? 'failed' : 'passed'

  // Update test case result
  await updateTestRun(runId, {
    [`testCaseResults.${testCaseIndex}.status`]: tcStatus,
    [`testCaseResults.${testCaseIndex}.completedAt`]: new Date(),
    [`testCaseResults.${testCaseIndex}.durationMs`]: tcDuration,
    [`testCaseResults.${testCaseIndex}.failedStepNumber`]: failedStepNumber,
    [`testCaseResults.${testCaseIndex}.errorMessage`]: errorMessage,
    [`testCaseResults.${testCaseIndex}.screenshotPath`]: screenshotPath
  })

  const statusEmoji = tcStatus === 'passed' ? '✓' : '✗'
  await appendLog(runId, tcStatus === 'passed' ? 'success' : 'error', 'testcase', `${statusEmoji} ${title} — ${tcStatus} (${tcDuration}ms)`, testCaseId)
}

/**
 * Finalizes the run with summary data.
 */
async function finalizeRun(runId, status) {
  const run = await TestRun.findById(runId)
  if (!run) return

  let passedTests = 0
  let failedTests = 0
  let skippedTests = 0

  run.testCaseResults.forEach(tc => {
    if (tc.status === 'passed') passedTests++
    else if (tc.status === 'failed') failedTests++
    else skippedTests++
  })

  await updateTestRun(runId, {
    status,
    completedAt: new Date(),
    passedTests,
    failedTests,
    skippedTests,
    currentTestCaseId: '',
    currentTestCaseTitle: '',
    currentStepNumber: 0,
    currentStepAction: ''
  })

  await appendLog(runId, 'info', 'system', `Execution ${status}. Passed: ${passedTests}, Failed: ${failedTests}, Skipped: ${skippedTests}`)
}

/**
 * Appends a log entry to the run's executionLogs array.
 */
async function appendLog(runId, level, type, message, testCaseId = '', stepNumber = null) {
  await updateTestRun(runId, {
    $push: {
      executionLogs: {
        timestamp: new Date(),
        level,
        type,
        message,
        testCaseId,
        stepNumber
      }
    }
  })
}

/**
 * Gets execution run by ID.
 */
export async function getExecutionRun(runId) {
  return await TestRun.findById(runId).lean()
}

/**
 * Gets execution history for a project.
 */
export async function getProjectExecutions(projectId) {
  return await TestRun.find({ projectId })
    .sort({ createdAt: -1 })
    .select('-executionLogs -testCaseResults.stepResults')
    .lean()
}

/**
 * Gets lightweight status for polling.
 */
export async function getExecutionStatus(runId) {
  return await TestRun.findById(runId)
    .select('status passedTests failedTests skippedTests totalTests currentTestCaseTitle currentStepNumber currentStepAction')
    .lean()
}

/**
 * Cancels a running execution.
 */
export async function cancelExecution(runId) {
  const activeRun = activeRuns.get(runId)
  if (!activeRun) {
    const run = await TestRun.findById(runId)
    if (run && (run.status === 'running' || run.status === 'queued')) {
      await updateTestRun(runId, {
        status: 'failed',
        completedAt: new Date()
      })
      await appendLog(runId, 'error', 'system', 'Execution cancelled by user')
      return true
    }
    return false
  }

  activeRun.cancelRequested = true
  await appendLog(runId, 'error', 'system', 'Cancellation requested by user...')

  if (activeRun.browser) {
    try {
      await activeRun.browser.close()
    } catch (e) {
      // Ignore
    }
  }

  activeRuns.delete(runId)
  return true
}
