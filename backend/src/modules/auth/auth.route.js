import express from 'express'
import {
  me,
  googleLogin,
  googleNext,
  updateRole,
  getUsers,
  updateUserRole,
  updateProfile,
  toggleUserStatus,
} from './auth.controller.js'
import { authMiddleware } from '../../middleware/auth.js'
import { validate } from '../../middlewares/validate.middleware.js'
import {
  googleNextSchema,
  updateRoleSchema,
  updateUserRoleSchema,
  updateProfileSchema,
  toggleUserStatusSchema,
} from '../../schemas/auth.schema.js'

const router = express.Router()

router.get('/auth/google', googleLogin)
router.post('/user/google-next', validate(googleNextSchema), googleNext)
router.get('/user/me', authMiddleware, me)
router.put('/user/role', authMiddleware, validate(updateRoleSchema), updateRole)
router.put('/user/profile', authMiddleware, validate(updateProfileSchema), updateProfile)

router.get('/user/users', authMiddleware, getUsers)
router.put('/user/users/:id/role', authMiddleware, validate(updateUserRoleSchema), updateUserRole)
router.put('/user/users/:id/status', authMiddleware, validate(toggleUserStatusSchema), toggleUserStatus)

export default router
