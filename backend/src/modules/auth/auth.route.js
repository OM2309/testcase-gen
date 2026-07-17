import express from 'express'
import {
  me,
  googleLogin,
  googleNext,
  updateRole,
  getUsers,
  updateUserRole,
  updateProfile
} from './auth.controller.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = express.Router()

// Login with Google (Redirects user to Google Consent Screen - Legacy)
router.get('/auth/google', googleLogin)

// Google NextAuth registration and login endpoint
router.post('/auth/google-next', googleNext)

// Authenticated user profile routes
router.get('/auth/me', authMiddleware, me)
router.put('/auth/role', authMiddleware, updateRole)
router.put('/auth/profile', authMiddleware, updateProfile)

// Admin user management routes
router.get('/auth/users', authMiddleware, getUsers)
router.put('/auth/users/:id/role', authMiddleware, updateUserRole)

export default router
