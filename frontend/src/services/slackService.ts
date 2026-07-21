import { apiClient } from './apiClient'

export interface SlackStatus {
  connected: boolean
  teamName: string | null
  teamId: string | null
  connectedAt: string | null
}

export const slackService = {
  async getStatus() {
    const response = await apiClient.get<{ success: boolean; data: SlackStatus }>('/slack/status')
    return response.data
  },

  async getConnectUrl() {
    const response = await apiClient.get<{ success: boolean; data: { url: string } }>('/slack/connect')
    return response.data.data.url
  },

  async disconnect() {
    const response = await apiClient.delete<{ success: boolean; message: string }>('/slack/disconnect')
    return response.data
  }
}
