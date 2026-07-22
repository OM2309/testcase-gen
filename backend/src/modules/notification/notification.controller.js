import { notificationService } from './notification.service.js'
import { sendSuccess } from '../../utils/responseHelper.js'

export async function getNotifications(req, res, next) {
  try {
    const list = await notificationService.getNotifications(req.user.id)
    return sendSuccess(res, 'Notifications fetched successfully.', list)
  } catch (err) {
    next(err)
  }
}

export async function markAsRead(req, res, next) {
  try {
    const { notificationId } = req.params
    const notif = await notificationService.markAsRead(notificationId, req.user.id)
    return sendSuccess(res, 'Notification marked as read.', notif)
  } catch (err) {
    next(err)
  }
}

export async function markAllAsRead(req, res, next) {
  try {
    await notificationService.markAllAsRead(req.user.id)
    return sendSuccess(res, 'All notifications marked as read.')
  } catch (err) {
    next(err)
  }
}
