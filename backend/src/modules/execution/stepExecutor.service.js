/**
 * Step Executor Service
 * 
 * Executes individual test steps using Playwright.
 * Each action maps to a Playwright API call.
 */

import path from 'path'
import fs from 'fs'
import { resolveTarget, fuzzyResolve, fuzzyResolveField } from './targetResolver.service.js'

const STEP_TIMEOUT = 15000 // 15 seconds per step
const PROBE_TIMEOUT = 3000 // quick check for element existence before healing
const EXPECT_TIMEOUT = 5000 // wait for expected url/text after an action

/** Extracts the label part of a semantic target ("input:Name" -> "Name"). */
function targetValue(target) {
  const i = (target || '').indexOf(':')
  return i === -1 ? (target || '') : target.slice(i + 1).trim()
}

/**
 * Resolves an actionable target. Tries the strict semantic locator first; if it
 * isn't present quickly, falls back to the fuzzy DOM resolver ("self-healing")
 * so mismatched labels (e.g. target "button:Register" vs a real "Sign Up"
 * button) still work. Returns a single locator.
 */
async function locateForAction(page, target) {
  const primary = resolveTarget(page, target).first()
  try {
    await primary.waitFor({ state: 'attached', timeout: PROBE_TIMEOUT })
    return primary
  } catch {
    const healed = await fuzzyResolve(page, target)
    return healed || primary
  }
}

/**
 * Resolves a form field for fill/select. Tries the strict locator, then falls
 * back to label/placeholder-based field healing.
 */
async function locateForFill(page, target) {
  const primary = resolveTarget(page, target).first()
  try {
    await primary.waitFor({ state: 'attached', timeout: PROBE_TIMEOUT })
    return primary
  } catch {
    const healed = await fuzzyResolveField(page, targetValue(target))
    return healed || primary
  }
}

/**
 * After an action runs, verify the step's structured expectations (optional):
 * expectedUrl (page should navigate to a path) and expectedText (a message
 * should become visible). Returns { ok, error }.
 */
async function runExpectedChecks(page, step) {
  const expectedUrl = step.expectedUrl
  const expectedText = step.expectedText

  if (expectedUrl) {
    const want = resolvePagePath(expectedUrl)
    try {
      await page.waitForURL((u) => u.href.includes(want), { timeout: EXPECT_TIMEOUT })
    } catch {
      const cur = page.url()
      if (!cur.includes(want)) {
        return { ok: false, error: `Expected URL to contain "${want}" but got "${cur}"` }
      }
    }
  }

  if (expectedText) {
    try {
      await page.getByText(new RegExp(escapeRegex(expectedText), 'i')).first()
        .waitFor({ state: 'visible', timeout: EXPECT_TIMEOUT })
    } catch {
      return { ok: false, error: `Expected text "${expectedText}" was not visible` }
    }
  }

  return { ok: true }
}

/**
 * Executes a single test step on the given page.
 * 
 * @param {object} params
 * @param {import('playwright').Page} params.page
 * @param {object} params.step - { action, target, value }
 * @param {string} params.baseUrl
 * @param {string} params.screenshotDir - Directory to save screenshots
 * @returns {Promise<{ success: boolean, errorMessage?: string }>}
 */
export async function executeStep({ page, step, baseUrl, screenshotDir }) {
  const { action, target, value } = step

  try {
    switch (action.toLowerCase()) {
      case 'goto': {
        const pagePath = resolvePagePath(value)
        const url = /^https?:\/\//i.test(pagePath)
          ? pagePath
          : `${baseUrl.replace(/\/+$/, '')}/${pagePath.replace(/^\/+/, '')}`
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
        break
      }

      case 'click': {
        const locator = await locateForAction(page, target)
        await locator.click({ timeout: STEP_TIMEOUT })
        break
      }

      case 'fill': {
        const locator = await locateForFill(page, target)
        await locator.fill(value || '', { timeout: STEP_TIMEOUT })
        break
      }

      case 'select': {
        const locator = await locateForFill(page, target)
        await locator.selectOption(value || '', { timeout: STEP_TIMEOUT })
        break
      }

      case 'check': {
        const locator = await locateForAction(page, target)
        await locator.check({ timeout: STEP_TIMEOUT })
        break
      }

      case 'uncheck': {
        const locator = await locateForAction(page, target)
        await locator.uncheck({ timeout: STEP_TIMEOUT })
        break
      }

      case 'hover': {
        const locator = await locateForAction(page, target)
        await locator.hover({ timeout: STEP_TIMEOUT })
        break
      }

      case 'press': {
        if (target) {
          const locator = resolveTarget(page, target)
          await locator.press(value || 'Enter', { timeout: STEP_TIMEOUT })
        } else {
          await page.keyboard.press(value || 'Enter')
        }
        break
      }

      case 'waitfor': {
        if (target) {
          const locator = resolveTarget(page, target)
          await locator.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
        } else if (value) {
          // Wait for a time in ms
          const ms = parseInt(value, 10)
          if (!isNaN(ms)) {
            await page.waitForTimeout(ms)
          }
        }
        break
      }

      case 'assertvisible': {
        const locator = await locateForAction(page, target)
        await locator.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
        break
      }

      case 'asserthidden': {
        const locator = resolveTarget(page, target)
        await locator.waitFor({ state: 'hidden', timeout: STEP_TIMEOUT })
        break
      }

      case 'asserttext': {
        const textToCheck = value || target
        const found = await page.getByText(new RegExp(escapeRegex(textToCheck), 'i')).first()
        await found.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
        break
      }

      case 'asserturlcontains': {
        const expected = resolvePagePath(value || target)
        const currentUrl = page.url()
        if (!currentUrl.includes(expected)) {
          // Wait a moment and retry
          await page.waitForTimeout(2000)
          const retryUrl = page.url()
          if (!retryUrl.includes(expected)) {
            throw new Error(`URL assertion failed. Expected URL to contain "${expected}" but got "${retryUrl}"`)
          }
        }
        break
      }

      case 'assertvalue': {
        const locator = resolveTarget(page, target)
        const actualValue = await locator.inputValue({ timeout: STEP_TIMEOUT })
        if (actualValue !== value) {
          throw new Error(`Value assertion failed. Expected "${value}" but got "${actualValue}"`)
        }
        break
      }

      case 'assertcount': {
        const locator = resolveTarget(page, target)
        const count = await locator.count()
        const expectedCount = parseInt(value, 10)
        if (Number.isNaN(expectedCount)) {
          // No explicit expected count — treat as "at least one should exist".
          if (count < 1) {
            throw new Error(`Count assertion failed. Expected at least 1 element but found ${count}`)
          }
        } else if (count !== expectedCount) {
          throw new Error(`Count assertion failed. Expected ${expectedCount} elements but found ${count}`)
        }
        break
      }

      case 'screenshot': {
        if (screenshotDir) {
          fs.mkdirSync(screenshotDir, { recursive: true })
          const filename = value || `step-${step.stepNumber || 'manual'}.png`
          await page.screenshot({
            path: path.join(screenshotDir, filename),
            fullPage: false
          })
        }
        break
      }

      default: {
        throw new Error(`Unsupported action: "${action}"`)
      }
    }

    // Verify optional structured expectations (expectedUrl / expectedText).
    const expectCheck = await runExpectedChecks(page, step)
    if (!expectCheck.ok) {
      return { success: false, errorMessage: expectCheck.error }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      errorMessage: error.message || 'Unknown step execution error'
    }
  }
}

/**
 * Captures a failure screenshot and returns the relative path.
 * 
 * @param {import('playwright').Page} page
 * @param {string} screenshotDir
 * @param {string} filename
 * @returns {Promise<string>} relative path to screenshot
 */
export async function captureFailureScreenshot(page, screenshotDir, filename) {
  try {
    fs.mkdirSync(screenshotDir, { recursive: true })
    const filePath = path.join(screenshotDir, filename)
    await page.screenshot({ path: filePath, fullPage: false })
    // Return relative path for frontend use
    return filePath
  } catch (err) {
    console.error('[STEP EXECUTOR] Failed to capture screenshot:', err.message)
    return ''
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Resolves an Agent 2 navigation value into a real path/URL.
 *
 * Agent 2 emits symbolic page placeholders (e.g. "__PAGE_LOGIN__") when it does
 * not know the app's real routes. We map the common ones to conventional
 * routes, and fall back to converting "__PAGE_FOO_BAR__" -> "/foo-bar".
 * Anything else (already a path or absolute URL) is returned as-is.
 */
function resolvePagePath(value) {
  if (!value) return '/'
  const v = value.trim()
  if (/^https?:\/\//i.test(v)) return v

  const known = {
    __PAGE_HOME__: '/',
    __PAGE_LOGIN__: '/login',
    __PAGE_REGISTER__: '/register',
    __PAGE_SIGNUP__: '/signup',
    __PAGE_SIGNIN__: '/login',
    __PAGE_DASHBOARD__: '/dashboard',
    __PAGE_TASK_LIST__: '/tasks',
    __PAGE_TASKS__: '/tasks',
    __PAGE_PROFILE__: '/profile',
    __PAGE_SETTINGS__: '/settings',
    __PAGE_ACCOUNT__: '/account'
  }
  const upper = v.toUpperCase()
  if (known[upper]) return known[upper]

  // Generic placeholder: __PAGE_FOO_BAR__ -> /foo-bar
  const m = upper.match(/^__PAGE_(.+?)__$/)
  if (m) return '/' + m[1].toLowerCase().replace(/_/g, '-')

  return v
}
