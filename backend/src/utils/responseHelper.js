export function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    ...data
  })
}

export function sendError(res, message, statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error: message
  })
}

export function sendPaginated(res, data, total, page, limit) {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  })
}

export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 50))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}
