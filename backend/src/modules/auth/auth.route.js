import express from 'express'
import { register, login, me } from './auth.controller.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = express.Router()

router.post('/auth/register', register)
router.post('/auth/login', login)
router.get('/auth/me', authMiddleware, me)

export default router
