import express from 'express'
import { startInspector } from './inspector.controller.js'
import { validate } from '../../middlewares/validate.middleware.js'
import { startInspectorSchema } from '../../schemas/inspector.schema.js'

const router = express.Router()

router.post('/inspector/start', validate(startInspectorSchema), startInspector)

export default router
