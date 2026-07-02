import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { eventBus } from '../stream/eventBus.service.js'
import { runAgent3Recovery } from '../agents/agent3.service.js'
import ExecutionRun from '../../models/ExecutionRun.js'
import TestSuite from '../../models/TestSuite.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', '..', 'public', 'screenshots')

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

function resolveTarget(page, target) {
  if (!target) return null
  const targetStr = String(target).trim()

  if (targetStr.startsWith('input:')) {
    const field = targetStr.replace('input:', '').trim()
    return page.getByLabel(new RegExp(field, 'i'))
      .or(page.getByPlaceholder(new RegExp(field, 'i')))
      .or(page.locator(`input[name="${field}"], input[id="${field}"]`))
      .first()
  }

  if (targetStr.startsWith('button:')) {
    const label = targetStr.replace('button:', '').trim()
    return page.getByRole('button', { name: new RegExp(label, 'i') })
      .or(page.locator(`button:has-text("${label}")`))
      .or(page.locator(`input[type="submit"][value="${label}"]`))
      .first()
  }

  if (targetStr.startsWith('link:')) {
    const label = targetStr.replace('link:', '').trim()
    return page.getByRole('link', { name: new RegExp(label, 'i') })
      .or(page.locator(`a:has-text("${label}")`))
      .first()
  }

  if (targetStr.startsWith('text:')) {
    const text = targetStr.replace('text:', '').trim()
    return page.getByText(new RegExp(text, 'i')).first()
  }

  return page.locator(targetStr)
}

async function executeStepAction(page, step, baseUrl) {
  const action = step.action
  const target = step.target
  const value = step.value

  const locator = resolveTarget(page, target)

  switch (action) {
    case 'goto': {
      const url = value.startsWith('http') ? value : `${baseUrl}${value}`
      await page.goto(url, { waitUntil: 'load', timeout: 15000 })
      break
    }
    case 'click':
      await locator.waitFor({ state: 'visible', timeout: 5000 })
      await locator.click({ timeout: 5000 })
      break

    case 'fill':
      await locator.waitFor({ state: 'visible', timeout: 5000 })
      await locator.fill(value, { timeout: 5000 })
      break

    case 'select':
      await locator.waitFor({ state: 'visible', timeout: 5000 })
      await locator.selectOption(value, { timeout: 5000 })
      break

    case 'check':
      await locator.waitFor({ state: 'visible', timeout: 5000 })
      await locator.check({ timeout: 5000 })
      break

    case 'uncheck':
      await locator.waitFor({ state: 'visible', timeout: 5000 })
      await locator.uncheck({ timeout: 5000 })
      break

    case 'hover':
      await locator.waitFor({ state: 'visible', timeout: 5000 })
      await locator.hover({ timeout: 5000 })
      break

    case 'press':
      await page.keyboard.press(value)
      break

    case 'waitFor':
      if (target) {
        await locator.waitFor({ state: 'visible', timeout: parseInt(value) || 10000 })
      } else {
        await page.waitForTimeout(parseInt(value) || 2000)
      }
      break

    case 'assertText': {
      await locator.waitFor({ state: 'visible', timeout: 5000 })
      const text = await locator.innerText()
      if (!text.toLowerCase().includes(value.toLowerCase())) {
        throw new Error(`Text assertion failed. Expected element to contain "${value}", but found "${text}"`)
      }
      break
    }
    case 'assertVisible':
      await locator.waitFor({ state: 'visible', timeout: 5000 })
      break

    case 'assertHidden':
      await locator.waitFor({ state: 'hidden', timeout: 5000 })
      break

    case 'assertURLContains':
      await page.waitForURL(url => url.toLowerCase().includes(value.toLowerCase()), { timeout: 5000 })
      break

    case 'assertValue': {
      await locator.waitFor({ state: 'visible', timeout: 5000 })
      const val = await locator.inputValue()
      if (val !== value) {
        throw new Error(`Value assertion failed. Expected "${value}", but found "${val}"`)
      }
      break
    }
    case 'assertCount': {
      const count = await locator.count()
      if (count !== parseInt(value)) {
        throw new Error(`Count assertion failed. Expected ${value} elements, but found ${count}`)
      }
      break
    }
    case 'screenshot':
      break

    default:
      throw new Error(`Unsupported action type: ${action}`)
  }
}

export async function executeTestSuite(runId, suiteId, baseUrl, headless = true) {
  const testSuite = await TestSuite.findById(suiteId)
  if (!testSuite) {
    throw new Error('TestSuite not found')
  }

  await ExecutionRun.findByIdAndUpdate(runId, { status: 'running' })
  eventBus.emit(runId, { type: 'RUN_STARTED', runId, message: 'Execution started' })

  const browser = await chromium.launch({ headless })
  const testResults = []
  let passedCount = 0
  let failedCount = 0

  const testCases = testSuite.testCases || []

  for (const tc of testCases) {
    eventBus.emit(runId, {
      type: 'TEST_STARTED',
      runId,
      testCaseId: tc.id,
      title: tc.title
    })

    const context = await browser.newContext()
    const page = await context.newPage()
    const stepResults = []
    let tcStatus = 'passed'
    const tcStartTime = Date.now()

    for (const step of tc.steps) {
      eventBus.emit(runId, {
        type: 'STEP_STARTED',
        runId,
        testCaseId: tc.id,
        stepNumber: step.step_number,
        action: step.action,
        target: step.target,
        message: step.description || `Executing step ${step.step_number}`
      })

      const stepStartTime = Date.now()
      let stepStatus = 'passed'
      let stepMessage = 'Step passed'
      let stepScreenshot = ''
      let stepError = null
      let appliedRecovery = null

      try {
        await executeStepAction(page, step, baseUrl)
      } catch (err) {
        console.error(`[Playwright] Step failed: ${err.message}. Attempting AI Recovery...`)
        eventBus.emit(runId, {
          type: 'RECOVERY_STARTED',
          runId,
          testCaseId: tc.id,
          stepNumber: step.step_number,
          message: 'Attempting AI recovery'
        })

        const screenshotName = `${runId}_${tc.id}_step_${step.step_number}_fail.png`
        const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName)
        try {
          await page.screenshot({ path: screenshotPath })
          stepScreenshot = `/public/screenshots/${screenshotName}`
        } catch (_se) {}

        const currentUrl = page.url()
        let domSnippet = ''
        let visibleText = ''
        try {
          domSnippet = await page.evaluate(() => document.body.innerHTML.substring(0, 10000))
          visibleText = await page.evaluate(() => document.body.innerText.substring(0, 5000))
        } catch (_e) {}

        try {
          const recoveryResult = await runAgent3Recovery({
            testCase: tc,
            failedStep: step,
            errorMessage: err.message,
            currentUrl,
            domSnippet,
            visibleText
          })

          if (recoveryResult && !recoveryResult.cannot_recover && recoveryResult.suggested_step) {
            appliedRecovery = recoveryResult
            console.log(`[AI Recovery] Suggested recovery step:`, recoveryResult.suggested_step)
            eventBus.emit(runId, {
              type: 'RECOVERY_APPLIED',
              runId,
              testCaseId: tc.id,
              stepNumber: step.step_number,
              message: `Recovered: ${recoveryResult.reason}`,
              recovery: recoveryResult.suggested_step
            })

            await executeStepAction(page, recoveryResult.suggested_step, baseUrl)
          } else {
            throw err
          }
        } catch (recoveryErr) {
          tcStatus = 'failed'
          stepStatus = 'failed'
          stepMessage = err.message
          stepError = { message: err.message, stack: err.stack }
        }
      }

      const stepDuration = Date.now() - stepStartTime
      stepResults.push({
        step_number: step.step_number,
        action: step.action,
        status: stepStatus,
        duration_ms: stepDuration,
        message: stepMessage,
        screenshot: stepScreenshot,
        error: stepError,
        recovery: appliedRecovery
      })

      if (stepStatus === 'passed') {
        eventBus.emit(runId, {
          type: 'STEP_PASSED',
          runId,
          testCaseId: tc.id,
          stepNumber: step.step_number,
          message: 'Step passed'
        })
      } else {
        eventBus.emit(runId, {
          type: 'STEP_FAILED',
          runId,
          testCaseId: tc.id,
          stepNumber: step.step_number,
          message: stepMessage,
          screenshot: stepScreenshot
        })
        break
      }
    }

    await context.close()

    if (tcStatus === 'passed') {
      passedCount++
    } else {
      failedCount++
    }

    testResults.push({
      test_case_id: tc.id,
      title: tc.title,
      status: tcStatus,
      duration_ms: Date.now() - tcStartTime,
      steps: stepResults,
      artifacts: {
        screenshots: stepResults.filter(r => r.screenshot).map(r => r.screenshot)
      }
    })

    eventBus.emit(runId, {
      type: 'TEST_FINISHED',
      runId,
      testCaseId: tc.id,
      status: tcStatus
    })
  }

  await browser.close()

  const finalRun = await ExecutionRun.findByIdAndUpdate(runId, {
    status: passedCount + failedCount === 0 ? 'failed' : 'completed',
    endedAt: new Date(),
    summary: {
      total: testCases.length,
      passed: passedCount,
      failed: failedCount,
      skipped: testCases.length - (passedCount + failedCount)
    },
    results: testResults
  }, { returnDocument: 'after' })

  eventBus.emit(runId, {
    type: 'RUN_FINISHED',
    runId,
    summary: finalRun.summary
  })
}
