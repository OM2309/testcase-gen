import { apiClient } from './apiClient'

export interface User {
  _id: string
  username: string
  email: string
  role: 'admin' | 'project_manager' | 'qa' | 'developer' | 'pending'
  createdAt: string
  updatedAt: string
}

export const authService = {
  async updateRole(role: 'project_manager' | 'qa' | 'developer') {
    const response = await apiClient.put<{ success: boolean; data: any }>('/auth/role', { role })
    return response.data
  },

  async updateProfile(payload: { username: string; role?: 'project_manager' | 'qa' | 'developer' }) {
    const response = await apiClient.put<{ success: boolean; data: any }>('/auth/profile', payload)
    return response.data
  },

  async getUsers() {
    const response = await apiClient.get<{ success: boolean; data: User[] }>('/auth/users')
    return response.data
  },

  async updateUserRole(userId: string, role: string) {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/auth/users/${userId}/role`, { role })
    return response.data
  }
}
