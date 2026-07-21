import express from 'express'
import { slackConnect, slackStatus, slackDisconnect, slackChannels, slackSendMessage } from './slack.controller.js'
import { authMiddleware } from '../../middleware/auth.js'

const router = express.Router()

// Redirect user to Slack OAuth consent page (authenticated)
router.get('/slack/connect', authMiddleware, slackConnect)

// Slack connection status (authenticated)
router.get('/slack/status', authMiddleware, slackStatus)

// Disconnect Slack (authenticated)
router.delete('/slack/disconnect', authMiddleware, slackDisconnect)

// Get Slack channels and users (authenticated)
router.get('/slack/channels', authMiddleware, slackChannels)

// Send message on Slack (authenticated)
router.post('/slack/send', authMiddleware, slackSendMessage)

export default router
