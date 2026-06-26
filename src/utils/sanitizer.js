export function sanitizeJsonResponse(raw) {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  cleaned = cleaned.trim()
  return cleaned
}

export function sanitizeCodeResponse(raw) {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/^```(?:javascript|js)?\s*/i, '').replace(/\s*```$/i, '')
  cleaned = cleaned.trim()
  return cleaned
}

export function parseJsonSafe(raw, type = 'object') {
  const cleaned = sanitizeJsonResponse(raw)

  try {
    return JSON.parse(cleaned)
  } catch (_firstError) {
    const pattern = type === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/
    const match = cleaned.match(pattern)
    if (match) {
      return JSON.parse(match[0])
    }
    throw new Error(`Failed to parse ${type} from agent response.`)
  }
}

export function sanitizeFileName(name) {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export function formatElapsed(startTime) {
  return ((Date.now() - startTime) / 1000).toFixed(1)
}
