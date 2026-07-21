import { chromium } from 'playwright'

async function launchInteractiveBrowser() {
  const explicitPath = process.env.PLAYWRIGHT_CHROME_PATH
  if (explicitPath) {
    return chromium.launch({ headless: false, executablePath: explicitPath })
  }
  try {
    return await chromium.launch({ headless: false })
  } catch (err) {
    const missing = /Executable doesn't exist|Failed to launch|ENOENT/i.test(err?.message || '')
    if (!missing) throw err
    return chromium.launch({ headless: false, channel: 'chrome' })
  }
}

export class InspectorService {
  async inspectPage(url) {
    let browser = null
    let finished = false

    try {
      browser = await launchInteractiveBrowser()
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      })
      const page = await context.newPage()

      const selectorPromise = new Promise(async (resolve, reject) => {
        await page.exposeFunction('onElementSelected', (data) => resolve(data))

        browser.on('disconnected', () => {
          if (!finished) {
            reject(new Error('Browser was closed manually by user'))
          }
        })

        await page.addInitScript(() => {
          window.playwrightInspectorActive = false
          window.lastHighlightedEl = null

          const injectUI = () => {
            if (document.getElementById('pw-inspector-panel')) return

            const style = document.createElement('style')
            style.innerHTML = `
              .pw-inspector-hover {
                outline: 3px solid #FF6B00 !important;
                outline-offset: -2px !important;
                background-color: rgba(255, 107, 0, 0.15) !important;
                cursor: crosshair !important;
              }
              #pw-inspector-panel {
                position: fixed;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 2147483647;
                background: #1e1e2e;
                border: 2px solid #FF6B00;
                border-radius: 12px;
                padding: 8px 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                color: white;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 14px;
                pointer-events: auto;
                user-select: none;
              }
              #pw-inspector-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #f38ba8;
                box-shadow: 0 0 8px #f38ba8;
              }
              #pw-inspector-panel.active #pw-inspector-indicator {
                background-color: #a6e3a1;
                box-shadow: 0 0 8px #a6e3a1;
                animation: pw-pulse 1.5s infinite alternate;
              }
              @keyframes pw-pulse {
                0% { opacity: 0.6; }
                100% { opacity: 1; }
              }
              #pw-inspector-btn {
                background: #FF6B00;
                border: none;
                color: white;
                font-weight: bold;
                padding: 5px 12px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s ease;
              }
              #pw-inspector-btn:hover { background: #e05e00; }
              #pw-inspector-panel.active #pw-inspector-btn { background: #f38ba8; }
            `
            document.head.appendChild(style)

            const panel = document.createElement('div')
            panel.id = 'pw-inspector-panel'
            panel.innerHTML = `
              <div id="pw-inspector-indicator"></div>
              <div id="pw-inspector-status">Mode: Navigation / Login</div>
              <button id="pw-inspector-btn">Start Selecting</button>
            `
            document.body.appendChild(panel)

            const btn = panel.querySelector('#pw-inspector-btn')
            const status = panel.querySelector('#pw-inspector-status')

            btn.addEventListener('click', (e) => {
              e.preventDefault()
              e.stopPropagation()
              window.playwrightInspectorActive = !window.playwrightInspectorActive
              if (window.playwrightInspectorActive) {
                panel.classList.add('active')
                status.innerText = 'Mode: Click target element'
                btn.innerText = 'Pause Selector'
              } else {
                panel.classList.remove('active')
                status.innerText = 'Mode: Navigation / Login'
                btn.innerText = 'Start Selecting'
                if (window.lastHighlightedEl) {
                  window.lastHighlightedEl.classList.remove('pw-inspector-hover')
                  window.lastHighlightedEl = null
                }
              }
            })
          }

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectUI)
          } else {
            injectUI()
          }

          let lastEl = null
          document.addEventListener('mouseover', (e) => {
            if (!window.playwrightInspectorActive || e.target.closest('#pw-inspector-panel')) return
            e.stopPropagation()
            if (lastEl) lastEl.classList.remove('pw-inspector-hover')
            lastEl = e.target
            window.lastHighlightedEl = lastEl
            lastEl.classList.add('pw-inspector-hover')
          }, true)

          document.addEventListener('mouseout', (e) => {
            if (!window.playwrightInspectorActive || e.target.closest('#pw-inspector-panel')) return
            e.stopPropagation()
            if (lastEl) {
              lastEl.classList.remove('pw-inspector-hover')
              lastEl = null
              window.lastHighlightedEl = null
            }
          }, true)

          document.addEventListener('click', (e) => {
            if (!window.playwrightInspectorActive || e.target.closest('#pw-inspector-panel')) return
            e.preventDefault()
            e.stopPropagation()

            const el = e.target
            if (!el) return
            el.classList.remove('pw-inspector-hover')

            let type = 'custom'
            let name = ''

            if (el.tagName === 'BUTTON' || (el.tagName === 'A' && el.getAttribute('role') === 'button') || el.type === 'submit') {
              const text = el.innerText || el.textContent || ''
              if (text.trim()) { type = 'button'; name = text.trim().replace(/\s+/g, ' ') }
            } else if (el.tagName === 'A') {
              const text = el.innerText || el.textContent || ''
              if (text.trim()) { type = 'link'; name = text.trim().replace(/\s+/g, ' ') }
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
              if (el.getAttribute('placeholder')) {
                type = 'placeholder'
                name = el.getAttribute('placeholder').trim()
              } else if (el.id) {
                const label = document.querySelector(`label[for="${el.id}"]`)
                name = label ? label.innerText.trim() : `#${el.id}`
                type = label ? el.tagName.toLowerCase() : 'custom'
              } else if (el.name) {
                type = el.tagName.toLowerCase()
                name = el.name
              }
            }

            if (type === 'custom' && !name) {
              name = el.id ? `#${el.id}` : el.tagName.toLowerCase()
            }

            window.onElementSelected({ type, name })
          }, true)
        })

        try {
          await page.goto(url)
        } catch (err) {
          reject(new Error(`Failed to load page: ${err.message}`))
        }
      })

      const result = await selectorPromise
      finished = true
      await browser.close()
      return result
    } catch (err) {
      finished = true
      if (browser) {
        try { await browser.close() } catch (_) {}
      }
      throw err
    }
  }
}

export const inspectorService = new InspectorService()
