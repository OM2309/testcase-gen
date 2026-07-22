import jwt from 'jsonwebtoken'
import env from '../config/env.js'

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. No token provided.'
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, env.jwtSecret || 'supersecretjwtkeyforauth')
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token.'
    })
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to perform this action.'
      })
    }
    next()
  }
}

