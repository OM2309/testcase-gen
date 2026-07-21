import { apiClient } from './apiClient'
import { User } from '../types'

export type { User }

export const authService = {
  async updateRole(role: 'project_manager' | 'qa' | 'developer') {
    const response = await apiClient.put<{ success: boolean; data: any }>('/user/role', { role })
    return response.data
  },

  async updateProfile(payload: { username: string; role?: 'project_manager' | 'qa' | 'developer' }) {
    const response = await apiClient.put<{ success: boolean; data: any }>('/user/profile', payload)
    return response.data
  },

  async getUsers() {
    const response = await apiClient.get<{ success: boolean; data: User[] }>('/user/users')
    return response.data
  },

  async updateUserRole(userId: string, role: string) {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/user/users/${userId}/role`, { role })
    return response.data
  },

  async updateUserStatus(userId: string, isActive: boolean) {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/user/users/${userId}/status`, { isActive })
    return response.data
  }
}
