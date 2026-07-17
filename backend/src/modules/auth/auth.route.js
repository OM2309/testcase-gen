import express from 'express'
import { me, googleLogin } from './auth.controller.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = express.Router()

// Login with Google (Redirects user to Google Consent Screen)
router.get('/auth/google', googleLogin)

router.get('/auth/me', authMiddleware, me)

export default router
