import express from 'express'
import { startInspector } from './inspector.controller.js'

const router = express.Router()

router.post('/inspector/start', startInspector)

export default router
