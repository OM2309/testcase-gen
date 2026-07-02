import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { eventBus } from './eventBus.service.js'
import { runAgent3Recovery } from '../../agent/services/agent3.service.js'
import ExecutionRun from '../executionRun.model.js'
import TestSuite from '../testSuite.model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', '..', 'public', 'screenshots')

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

// ─────────────────────────────────────────────
// 6-Strategy Target Resolver
// ─────────────────────────────────────────────
async function resolveTarget(page, target) {
  if (!target) return null
  const targetStr = String(target).trim()

  // Parse tag-prefix format: "input:Email", "button:Submit", etc.
  const match = targetStr.match(/^(input|textarea|select|button|link|text|div|span|label):(.+)$/i)

  if (match) {
    const tagName = match[1].toLowerCase()
    const field = match[2].trim()
    const fieldRegex = new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    // Buttons and links — role-based
    if (tagName === 'button') {
      const candidates = [
        page.getByRole('button', { name: fieldRegex }),
        page.locator(`button:has-text("${field}")`),
        page.locator(`input[type="submit"]`).filter({ hasText: field }),
        page.locator(`input[type="button"][value="${field}"]`),
        page.locator(`[data-testid*="${field.toLowerCase()}"]`),
        page.getByText(fieldRegex).filter({ hasText: field })
      ]
      for (const c of candidates) {
        try {
          if (await c.first().count() > 0) return c.first()
        } catch (_) {}
      }
      return page.getByRole('button', { name: fieldRegex }).first()
    }

    if (tagName === 'link') {
      return page.getByRole('link', { name: fieldRegex })
        .or(page.locator(`a:has-text("${field}")`))
        .first()
    }

    if (tagName === 'text') {
      return page.getByText(fieldRegex).first()
    }

    // Input / textarea / select — 6-strategy waterfall
    const strategies = [
      () => page.getByLabel(fieldRegex).first(),
      () => page.getByPlaceholder(fieldRegex).first(),
      () => page.getByRole('textbox', { name: fieldRegex }).first(),
      () => page.locator(`${tagName}[name="${field}"], ${tagName}[id="${field}"]`).first(),
      () => page.locator(`[data-testid*="${field.toLowerCase()}"]`).first(),
      () => page.locator(`${tagName}[placeholder*="${field}" i], ${tagName}[aria-label*="${field}" i]`).first()
    ]

    for (const strategy of strategies) {
      try {
        const el = strategy()
        const count = await el.count()
        if (count > 0) return el
      } catch (_) {}
    }

    // Final fallback — return first strategy (let the caller handle the error)
    return page.getByLabel(fieldRegex).first()
  }

  // Raw CSS or Playwright selector
  return page.locator(targetStr)
}

// ─────────────────────────────────────────────
// Execute a Single Step Action (with retry)
// ─────────────────────────────────────────────
async function executeStepAction(page, step, baseUrl) {
  const action = step.action
  const target = step.target
  const value = step.value || ''

  switch (action) {
    case 'goto': {
      // AI sometimes puts page name in target (e.g. 'page:Registration') and leaves value empty
      // Resolve the URL: prefer value, fallback to target
      let rawUrl = value || ''

      if (!rawUrl && target) {
        const tStr = String(target).trim()
        // Map 'page:SomeName' or bare page name to a URL path
        const pageName = tStr.replace(/^page:/i, '').trim().toLowerCase()
        const pageRouteMap = {
          'registration': '/register',
          'register': '/register',
          'signup': '/register',
          'sign up': '/register',
          'login': '/login',
          'signin': '/login',
          'sign in': '/login',
          'logout': '/logout',
          'home': '/',
          'dashboard': '/dashboard',
          'profile': '/profile',
          'settings': '/settings',
          'todo': '/todos',
          'todos': '/todos',
          'tasks': '/tasks',
        }
        rawUrl = pageRouteMap[pageName] || `/${pageName}`
      }

      const url = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl}`
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
      // Extra wait for JS-heavy SPA apps (React/Vue/Angular)
      await page.waitForTimeout(1500)
      break
    }

    case 'click': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'visible', timeout: 10000 })
      await locator.scrollIntoViewIfNeeded()
      await locator.click({ timeout: 10000 })
      break
    }

    case 'fill': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'visible', timeout: 10000 })
      await locator.scrollIntoViewIfNeeded()
      await locator.fill(value, { timeout: 10000 })
      break
    }

    case 'type': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'visible', timeout: 10000 })
      await locator.type(value, { delay: 50 })
      break
    }

    case 'select': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'visible', timeout: 10000 })
      await locator.selectOption(value, { timeout: 10000 })
      break
    }

    case 'check': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'visible', timeout: 10000 })
      await locator.check({ timeout: 10000 })
      break
    }

    case 'uncheck': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'visible', timeout: 10000 })
      await locator.uncheck({ timeout: 10000 })
      break
    }

    case 'hover': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'visible', timeout: 10000 })
      await locator.hover({ timeout: 10000 })
      break
    }

    case 'press':
      await page.keyboard.press(value)
      break

    case 'waitFor':
      if (target) {
        const locator = await resolveTarget(page, target)
        await locator.waitFor({ state: 'visible', timeout: parseInt(value) || 10000 })
      } else {
        await page.waitForTimeout(parseInt(value) || 2000)
      }
      break

    case 'scroll':
      await page.evaluate(() => window.scrollBy(0, 400))
      break

    case 'assertText': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'visible', timeout: 10000 })
      const text = await locator.innerText()
      if (!text.toLowerCase().includes(value.toLowerCase())) {
        throw new Error(`Assertion failed: expected to contain "${value}", found "${text}"`)
      }
      break
    }

    case 'assertVisible': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'visible', timeout: 10000 })
      break
    }

    case 'assertHidden': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'hidden', timeout: 10000 })
      break
    }

    case 'assertURLContains':
      await page.waitForURL(url => url.toLowerCase().includes(value.toLowerCase()), { timeout: 10000 })
      break

    case 'assertValue': {
      const locator = await resolveTarget(page, target)
      await locator.waitFor({ state: 'visible', timeout: 10000 })
      const val = await locator.inputValue()
      if (val !== value) {
        throw new Error(`Value assertion failed: expected "${value}", found "${val}"`)
      }
      break
    }

    case 'assertCount': {
      const locator = await resolveTarget(page, target)
      const count = await locator.count()
      if (count !== parseInt(value)) {
        throw new Error(`Count assertion failed: expected ${value}, found ${count}`)
      }
      break
    }

    case 'screenshot':
      // Handled externally on failures; skip silently here
      break

    default:
      throw new Error(`Unsupported action: "${action}"`)
  }
}

// ─────────────────────────────────────────────
// Capture Screenshot Helper
// ─────────────────────────────────────────────
async function captureScreenshot(page, runId, tcId, stepNum, label = 'fail') {
  try {
    const name = `${runId}_${tcId}_step${stepNum}_${label}.png`
    const screenshotPath = path.join(SCREENSHOTS_DIR, name)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    return `/public/screenshots/${name}`
  } catch (_) {
    return ''
  }
}

// ─────────────────────────────────────────────
// Main Execution Entry Point
// ─────────────────────────────────────────────
export async function executeTestSuite(runId, suiteId, baseUrl, headless = true) {
  // Give SSE client 1.5s to connect before we start emitting events
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const testSuite = await TestSuite.findById(suiteId)
  if (!testSuite) throw new Error('TestSuite not found')

  await ExecutionRun.findByIdAndUpdate(runId, { status: 'running' })
  eventBus.emit(runId, { type: 'RUN_STARTED', runId })

  const browser = await chromium.launch({ headless })
  const testCases = testSuite.testCases || []
  const testResults = []
  let passedCount = 0
  let failedCount = 0

  for (const tc of testCases) {
    eventBus.emit(runId, {
      type: 'TEST_STARTED',
      runId,
      testCaseId: tc.id,
      title: tc.title
    })

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    })
    const page = await context.newPage()
    const stepResults = []
    let tcStatus = 'passed'
    const tcStartTime = Date.now()

    for (const step of (tc.steps || [])) {
      const stepKey = `${tc.id}_step_${step.step_number}`

      eventBus.emit(runId, {
        type: 'STEP_STARTED',
        runId,
        testCaseId: tc.id,
        stepNumber: step.step_number,
        action: step.action,
        target: step.target,
        message: step.description || `Executing ${step.action}`
      })

      const stepStartTime = Date.now()
      let stepStatus = 'passed'
      let stepMessage = 'Step passed'
      let stepScreenshot = ''
      let stepError = null
      let appliedRecovery = null

      // ── Attempt the step (up to 2 tries before AI recovery) ──
      let lastErr = null
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await executeStepAction(page, step, baseUrl)
          lastErr = null
          break
        } catch (err) {
          lastErr = err
          if (attempt < 2) {
            await page.waitForTimeout(700)
          }
        }
      }

      // ── If both attempts failed, try Agent 3 recovery ──
      if (lastErr) {
        console.error(`[Runner] Step ${step.step_number} failed after 2 attempts: ${lastErr.message}`)

        stepScreenshot = await captureScreenshot(page, runId, tc.id, step.step_number, 'fail')

        eventBus.emit(runId, {
          type: 'RECOVERY_STARTED',
          runId,
          testCaseId: tc.id,
          stepNumber: step.step_number,
          message: 'AI recovery analyzing failure...',
          screenshot: stepScreenshot
        })

        const currentUrl = page.url()
        let domSnippet = ''
        let visibleText = ''
        try {
          domSnippet = await page.evaluate(() => document.body.innerHTML.substring(0, 10000))
          visibleText = await page.evaluate(() => document.body.innerText.substring(0, 5000))
        } catch (_) {}

        let recovered = false
        try {
          const recoveryResult = await runAgent3Recovery({
            testCase: tc,
            failedStep: step,
            errorMessage: lastErr.message,
            currentUrl,
            domSnippet,
            visibleText
          })

          if (recoveryResult && !recoveryResult.cannot_recover && recoveryResult.suggested_step) {
            appliedRecovery = recoveryResult
            eventBus.emit(runId, {
              type: 'RECOVERY_APPLIED',
              runId,
              testCaseId: tc.id,
              stepNumber: step.step_number,
              message: recoveryResult.reason || 'Recovery applied',
              recovery: recoveryResult.suggested_step
            })

            // Try the recovered step
            try {
              await executeStepAction(page, recoveryResult.suggested_step, baseUrl)
              recovered = true
              stepMessage = `Recovered: ${recoveryResult.reason}`
            } catch (recoveryErr) {
              console.error(`[Runner] Recovery step also failed: ${recoveryErr.message}`)
            }
          }
        } catch (agentErr) {
          console.error(`[Runner] Agent 3 failed: ${agentErr.message}`)
        }

        if (!recovered) {
          tcStatus = 'failed'
          stepStatus = 'failed'
          stepMessage = lastErr.message
          stepError = { message: lastErr.message }
        }
      }

      const stepDuration = Date.now() - stepStartTime
      stepResults.push({
        step_number: step.step_number,
        action: step.action,
        target: step.target,
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
          message: stepMessage,
          duration: stepDuration
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
        break // Stop remaining steps for this test case on failure
      }
    }

    await context.close()

    if (tcStatus === 'passed') passedCount++
    else failedCount++

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
      status: tcStatus,
      duration: Date.now() - tcStartTime
    })
  }

  await browser.close()

  const summary = {
    total: testCases.length,
    passed: passedCount,
    failed: failedCount,
    skipped: testCases.length - passedCount - failedCount
  }

  const finalRun = await ExecutionRun.findByIdAndUpdate(runId, {
    status: 'completed',
    endedAt: new Date(),
    summary,
    results: testResults
  }, { returnDocument: 'after' })

  eventBus.emit(runId, {
    type: 'RUN_FINISHED',
    runId,
    summary: finalRun.summary,
    results: testResults
  })
}
