import { notificationRepository } from './notification.repository.js'

export class NotificationService {
  constructor(notificationRepo = notificationRepository) {
    this.notificationRepo = notificationRepo
  }

  async createNotification(data) {
    return this.notificationRepo.create(data)
  }

  async getNotifications(recipientId) {
    return this.notificationRepo.findByRecipient(recipientId)
  }

  async markAsRead(notificationId, recipientId) {
    return this.notificationRepo.markAsRead(notificationId, recipientId)
  }

  async markAllAsRead(recipientId) {
    return this.notificationRepo.markAllAsRead(recipientId)
  }
}

export const notificationService = new NotificationService()
