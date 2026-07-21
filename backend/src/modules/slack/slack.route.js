import express from 'express'
import { slackConnect, slackStatus, slackDisconnect } from './slack.controller.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = express.Router()

// Redirect user to Slack OAuth consent page (authenticated)
router.get('/slack/connect', authMiddleware, slackConnect)

// Slack connection status (authenticated)
router.get('/slack/status', authMiddleware, slackStatus)

// Disconnect Slack (authenticated)
router.delete('/slack/disconnect', authMiddleware, slackDisconnect)

export default router
