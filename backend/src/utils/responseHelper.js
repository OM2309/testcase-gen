export function sendSuccess(res, message, data = null, statusCode = 200) {
  const payload = { success: true, message }
  if (data !== null) payload.data = data
  return res.status(statusCode).json(payload)
}

export function sendError(res, message, statusCode = 500, details = null) {
  const payload = { success: false, message, error: { code: statusCode } }
  if (details !== null) payload.error.details = details
  return res.status(statusCode).json(payload)
}
