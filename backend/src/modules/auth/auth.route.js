import express from 'express'
import {
  me,
  googleLogin,
  googleNext,
  updateRole,
  getUsers,
  updateUserRole,
  updateProfile,
  toggleUserStatus
} from './auth.controller.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = express.Router()

// Login with Google (Redirects user to Google Consent Screen - Legacy)
router.get('/auth/google', googleLogin)

// Google NextAuth registration and login endpoint
router.post('/user/google-next', googleNext)

// Authenticated user profile routes
router.get('/user/me', authMiddleware, me)
router.put('/user/role', authMiddleware, updateRole)
router.put('/user/profile', authMiddleware, updateProfile)

// Admin user management routes
router.get('/user/users', authMiddleware, getUsers)
router.put('/user/users/:id/role', authMiddleware, updateUserRole)
router.put('/user/users/:id/status', authMiddleware, toggleUserStatus)

export default router
