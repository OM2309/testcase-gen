import Notification from './notification.model.js'

export class NotificationRepository {
  async create(data) {
    return Notification.create(data)
  }

  async findByRecipient(recipientId) {
    return Notification.find({ recipientId })
      .sort({ createdAt: -1 })
      .populate('senderId', 'username email role')
      .populate('projectId', 'projectName')
      .populate('testSuiteId', 'suiteName srsDocumentId')
      .lean()
  }

  async markAsRead(notificationId, recipientId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipientId },
      { isRead: true },
      { new: true }
    )
  }

  async markAllAsRead(recipientId) {
    return Notification.updateMany(
      { recipientId, isRead: false },
      { isRead: true }
    )
  }
}

export const notificationRepository = new NotificationRepository()
