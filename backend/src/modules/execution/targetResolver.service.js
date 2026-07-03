/**
 * Target Resolver Service
 * 
 * Converts Agent 2 semantic targets (e.g. "button:Login", "input:email")
 * into Playwright locators.
 */

/**
 * Resolves a semantic target string into a Playwright locator.
 * 
 * Supported formats:
 * - input:fieldName  -> getByRole/label or CSS selector
 * - button:text      -> getByRole('button', { name })
 * - text:content     -> getByText()
 * - link:text        -> getByRole('link', { name })
 * - checkbox:label   -> getByRole('checkbox', { name })
 * - select:name      -> select[name] or getByLabel
 * - textarea:name    -> textarea or getByLabel
 * - heading:text     -> getByRole('heading', { name })
 * - CSS selector     -> direct locator()
 * 
 * @param {import('playwright').Page} page
 * @param {string} target
 * @returns {import('playwright').Locator}
 */
export function resolveTarget(page, target) {
  if (!target) return null

  // If target contains : separator, parse semantic format
  const colonIdx = target.indexOf(':')
  if (colonIdx === -1) {
    // Treat as CSS selector or plain text
    return page.locator(target)
  }

  const type = target.substring(0, colonIdx).toLowerCase().trim()
  const value = target.substring(colonIdx + 1).trim()

  switch (type) {
    case 'input': {
      return resolveInput(page, value)
    }
    case 'button': {
      const re = new RegExp(escapeRegex(value), 'i')
      // Buttons are often rendered as <a>/role=link in SPAs — accept either.
      return page.getByRole('button', { name: re })
        .or(page.getByRole('link', { name: re }))
        .first()
    }
    case 'text': {
      return page.getByText(new RegExp(escapeRegex(value), 'i'))
    }
    case 'toast': {
      // Toast/notification message — behaves like a text assertion.
      return page.getByText(new RegExp(escapeRegex(value), 'i'))
    }
    case 'table': {
      return value
        ? page.locator('table').filter({ hasText: new RegExp(escapeRegex(value), 'i') })
        : page.locator('table')
    }
    case 'link': {
      return page.getByRole('link', { name: new RegExp(escapeRegex(value), 'i') })
    }
    case 'checkbox': {
      return page.getByRole('checkbox', { name: new RegExp(escapeRegex(value), 'i') })
    }
    case 'radio': {
      return page.getByRole('radio', { name: new RegExp(escapeRegex(value), 'i') })
    }
    case 'select': {
      return page.locator(`select[name="${value}"], select[id="${value}"]`).first()
    }
    case 'textarea': {
      return page.locator(`textarea[name="${value}"], textarea[id="${value}"]`).or(
        page.getByLabel(new RegExp(escapeRegex(value), 'i'))
      ).first()
    }
    case 'heading': {
      return page.getByRole('heading', { name: new RegExp(escapeRegex(value), 'i') })
    }
    case 'label': {
      return page.getByLabel(new RegExp(escapeRegex(value), 'i'))
    }
    case 'placeholder': {
      return page.getByPlaceholder(new RegExp(escapeRegex(value), 'i'))
    }
    case 'testid': {
      return page.getByTestId(value)
    }
    case 'role': {
      // role:button or role:navigation etc.
      return page.getByRole(value)
    }
    default: {
      // Unknown semantic prefix. Passing "type:value" straight to a CSS
      // selector crashes ('table:Tasks' is not a valid selector), so fall back
      // to a text search on the value instead.
      return page.getByText(new RegExp(escapeRegex(value), 'i'))
    }
  }
}

/**
 * Resolves input fields - tries multiple strategies.
 * Attribute matching is case-insensitive (CSS `i` flag) because Agent 2 targets
 * (e.g. "input:Name") rarely match the app's exact casing (name="name").
 */
function resolveInput(page, fieldName) {
  const lower = fieldName.toLowerCase()

  // Common input type mappings
  const typeMap = {
    'email': 'email',
    'password': 'password',
    'search': 'search',
    'phone': 'tel',
    'tel': 'tel',
    'number': 'number',
    'url': 'url'
  }

  const inputType = typeMap[lower]
  const selectors = []
  if (inputType) selectors.push(`input[type="${inputType}"]`)
  selectors.push(
    `input[name="${fieldName}" i]`,
    `input[id="${fieldName}" i]`,
    `input[placeholder*="${fieldName}" i]`,
    `input[aria-label*="${fieldName}" i]`,
    `textarea[name="${fieldName}" i]`,
    `textarea[placeholder*="${fieldName}" i]`
  )

  return page.locator(selectors.join(', ')).first().or(
    page.getByLabel(new RegExp(escapeRegex(fieldName), 'i'))
  ).first()
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/* -------------------------------------------------------------------------- */
/*  Fuzzy DOM fallback ("self-healing") resolver                              */
/* -------------------------------------------------------------------------- */

// Synonym groups for common web actions — lets "Register" match a "Sign Up"
// button, "Login" match "Sign In", etc. when the app's real label differs from
// what Agent 2 guessed.
const SYNONYM_GROUPS = [
  ['register', 'sign up', 'signup', 'create account', 'get started', 'join'],
  ['login', 'log in', 'sign in', 'signin'],
  ['logout', 'log out', 'sign out', 'signout'],
  ['submit', 'save', 'confirm', 'continue', 'next', 'ok', 'done', 'apply'],
  ['add', 'create', 'new', 'insert', 'plus'],
  ['delete', 'remove', 'trash', 'discard'],
  ['edit', 'update', 'modify', 'change'],
  ['complete', 'done', 'finish', 'mark complete', 'mark as complete'],
  ['search', 'find', 'filter'],
  ['cancel', 'close', 'dismiss', 'back']
]

/** Scores how well a candidate element's text matches the wanted label (0..1). */
function scoreMatch(candidateText, wanted) {
  const c = (candidateText || '').toLowerCase().trim()
  const t = (wanted || '').toLowerCase().trim()
  if (!c || !t) return 0
  if (c === t) return 1

  // Token overlap = fraction of the wanted words present in the candidate.
  // This makes more-specific matches win (e.g. "Confirm Password" beats
  // "Password" for the confirm field).
  const cTokens = new Set(c.split(/\W+/).filter(Boolean))
  const tTokens = t.split(/\W+/).filter(Boolean)
  let score = 0
  if (tTokens.length) {
    const overlap = tTokens.filter(w => cTokens.has(w)).length
    score = overlap / tTokens.length
  }

  // Substring boost (candidate literally contains the wanted phrase)
  if (c.includes(t)) score = Math.max(score, 0.9)

  // Synonym-group boost (register↔sign up, login↔sign in, ...)
  for (const group of SYNONYM_GROUPS) {
    if (group.some(w => c.includes(w)) && group.some(w => t.includes(w))) {
      score = Math.max(score, 0.8)
    }
  }
  return score
}

// Which DOM elements are candidates for a given semantic type.
const CLICKABLE_SELECTOR =
  'button, a, [role=button], [role=link], [role=menuitem], [role=tab], input[type=submit], input[type=button], [onclick]'

/**
 * Fallback resolver used when the strict locator finds nothing. Scans the
 * page's visible interactive elements and returns a locator to the best text
 * match, or null if nothing scores above threshold.
 *
 * @param {import('playwright').Page} page
 * @param {string} target semantic target e.g. "button:Register"
 * @returns {Promise<import('playwright').Locator|null>}
 */
export async function fuzzyResolve(page, target) {
  if (!target) return null
  const colonIdx = target.indexOf(':')
  const type = colonIdx === -1 ? '' : target.substring(0, colonIdx).toLowerCase().trim()
  const value = colonIdx === -1 ? target : target.substring(colonIdx + 1).trim()
  if (!value) return null

  // Only heal clickable-style targets; inputs already resolve robustly.
  const clickableTypes = ['button', 'link', 'text', 'toast', 'menuitem', 'tab', '']
  if (!clickableTypes.includes(type)) return null

  let candidates = []
  try {
    candidates = await page.evaluate((sel) => {
      const els = Array.from(document.querySelectorAll(sel))
      const out = []
      els.forEach((el, i) => {
        const visible = !!(el.offsetParent || el.getClientRects().length)
        if (!visible) return
        el.setAttribute('data-tg-rec', String(i))
        const raw = el.innerText || el.textContent || el.value ||
          el.getAttribute('aria-label') || el.getAttribute('title') || ''
        out.push({ i, text: raw.trim().replace(/\s+/g, ' ').slice(0, 120) })
      })
      return out
    }, CLICKABLE_SELECTOR)
  } catch {
    return null
  }

  let best = null
  let bestScore = 0
  for (const cand of candidates) {
    const s = scoreMatch(cand.text, value)
    if (s > bestScore) { bestScore = s; best = cand }
  }

  if (best && bestScore >= 0.5) {
    return page.locator(`[data-tg-rec="${best.i}"]`).first()
  }
  return null
}

/**
 * Fallback resolver for form fields (input/textarea/select). Matches by the
 * field's associated/nearby label, placeholder, name, id or aria-label — useful
 * when a field's real attributes differ from the semantic name (e.g. target
 * "input:Name" but the field only has placeholder "John Doe" with a separate
 * label element).
 *
 * @param {import('playwright').Page} page
 * @param {string} value the field label we are looking for (e.g. "Name")
 * @returns {Promise<import('playwright').Locator|null>}
 */
export async function fuzzyResolveField(page, value) {
  if (!value) return null

  let candidates = []
  try {
    candidates = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('input, textarea, select'))
      const out = []
      els.forEach((el, i) => {
        const type = (el.getAttribute('type') || '').toLowerCase()
        if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) return
        const visible = !!(el.offsetParent || el.getClientRects().length)
        if (!visible) return
        el.setAttribute('data-tg-rec-f', String(i))

        const parts = []
        const push = (s) => { if (s && s.trim()) parts.push(s.trim()) }

        if (el.id) {
          const lf = document.querySelector(`label[for="${el.id}"]`)
          if (lf) push(lf.innerText || lf.textContent)
        }
        const wrap = el.closest('label')
        if (wrap) push(wrap.innerText || wrap.textContent)
        push(el.getAttribute('aria-label'))
        push(el.getAttribute('placeholder'))
        push(el.getAttribute('name'))
        push(el.id)
        // Label rendered as a sibling/parent element (common in React forms)
        const prev = el.previousElementSibling
        if (prev) push(prev.innerText || prev.textContent)
        const parent = el.parentElement
        if (parent) {
          const lbl = parent.querySelector('label')
          if (lbl) push(lbl.innerText || lbl.textContent)
        }

        out.push({ i, label: parts.join(' | ').replace(/\s+/g, ' ').trim().slice(0, 160) })
      })
      return out
    })
  } catch {
    return null
  }

  let best = null
  let bestScore = 0
  for (const cand of candidates) {
    const s = scoreMatch(cand.label, value)
    if (s > bestScore) { bestScore = s; best = cand }
  }

  if (best && bestScore >= 0.5) {
    return page.locator(`[data-tg-rec-f="${best.i}"]`).first()
  }
  return null
}
