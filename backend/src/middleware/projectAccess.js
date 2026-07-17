import Project from '../modules/project/project.model.js'
import User from '../modules/auth/user.model.js'
import { ApiError } from '../utils/apiError.js'

export async function projectAccessMiddleware(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    if (!user || user.isActive === false) {
      throw new ApiError('Access denied. Account is disabled or does not exist.', 403)
    }

    const projectId = req.params.projectId || req.body.projectId || req.query.projectId

    if (!projectId) {
      throw new ApiError('Project ID is required.', 400)
    }

    const project = await Project.findById(projectId)
    if (!project) {
      throw new ApiError('Project not found.', 404)
    }

    // Admin has universal access
    if (req.user.role === 'admin') {
      req.project = project
      return next()
    }

    // Owner (creator) has access
    const isOwner = project.userId && project.userId.toString() === req.user.id

    // Assigned member has access
    const isAssigned = project.assignedUsers && project.assignedUsers.some(
      (userId) => userId.toString() === req.user.id
    )

    if (!isOwner && !isAssigned) {
      throw new ApiError('Access denied. You do not have permission to access this project.', 403)
    }

    req.project = project
    next()
  } catch (err) {
    next(err)
  }
}
