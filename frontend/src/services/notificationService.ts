import { apiClient } from './apiClient'
import { ApiResponse, Notification } from '../types'

export const notificationService = {
  async getNotifications() {
    const response = await apiClient.get<ApiResponse<Notification[]>>('/notifications')
    return response.data
  },

  async markAsRead(notificationId: string) {
    const response = await apiClient.put<ApiResponse<Notification>>(`/notifications/${notificationId}/read`)
    return response.data
  },

  async markAllAsRead() {
    const response = await apiClient.put<ApiResponse<void>>('/notifications/mark-all-read')
    return response.data
  }
}
