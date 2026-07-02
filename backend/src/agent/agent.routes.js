import express from 'express'
import { analyzePRD, generateTestCases } from './agent.controller.js'

const router = express.Router()

router.post('/agent/analyze', analyzePRD)
router.post('/agent/testcases', generateTestCases)

export default router
