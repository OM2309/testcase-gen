import { apiClient } from './apiClient'

export interface SlackStatus {
  connected: boolean
  teamName: string | null
  teamId: string | null
  connectedAt: string | null
}

export interface SlackRecipient {
  id: string
  name: string
  displayName?: string
  type: 'channel' | 'user'
  isPrivate?: boolean
  memberCount?: number
  avatar?: string | null
}

export interface SlackChannelsAndUsers {
  channels: SlackRecipient[]
  users: SlackRecipient[]
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
  },

  async getChannels() {
    const response = await apiClient.get<{ success: boolean; data: SlackChannelsAndUsers }>('/slack/channels')
    return response.data.data
  },

  async sendMessage(channelIds: string[], text: string) {
    const response = await apiClient.post<{ success: boolean; data: { results: any[] } }>('/slack/send', {
      channelIds,
      text
    })
    return response.data
  }
}
