import express from 'express'
import { getNotifications, markAsRead, markAllAsRead } from './notification.controller.js'

const router = express.Router()

router.get('/notifications', getNotifications)
router.put('/notifications/mark-all-read', markAllAsRead)
router.put('/notifications/:notificationId/read', markAsRead)

export default router
