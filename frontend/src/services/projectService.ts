import { apiClient } from './apiClient'
import { Project, ProjectDetail } from '../types'

export const projectService = {
  async getAllProjects(search: string = '', page?: number, limit?: number) {
    const params = new URLSearchParams()
    if (search.trim()) params.append('search', search.trim())
    if (page) params.append('page', String(page))
    if (limit) params.append('limit', String(limit))
    const response = await apiClient.get<{ success: boolean; data: any }>(`/projects?${params.toString()}`)
    return response.data
  },

  async getProjectById(id: string) {
    const response = await apiClient.get<{ success: boolean; data: ProjectDetail }>(`/projects/${id}`)
    return response.data
  },

  async deleteProject(id: string) {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/projects/${id}`)
    return response.data
  },

  async assignUsers(projectId: string, userIds: string[]) {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/projects/${projectId}/assign`, { userIds })
    return response.data
  },

  async updateProject(projectId: string, payload: { projectName: string; projectDescription: string }) {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/projects/${projectId}`, payload)
    return response.data
  },

  async connectJira(projectId: string, payload: { host: string; email: string; token: string; projectKey: string; disconnect?: boolean }) {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/projects/${projectId}/jira-connect`, payload)
    return response.data
  },

  async getJiraIssues(projectId: string, search: string = '') {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(`/projects/${projectId}/jira-issues?search=${encodeURIComponent(search)}`)
    return response.data
  },

  async importJiraStories(projectId: string, issueKeys: string[]) {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/projects/${projectId}/jira-import`, { issueKeys })
    return response.data
  },

  async connectLinear(projectId: string, payload: { apiKey: string; teamId: string; disconnect?: boolean }) {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/projects/${projectId}/linear-connect`, payload)
    return response.data
  },

  async getLinearIssues(projectId: string, search: string = '') {
    const response = await apiClient.get<{ success: boolean; data: any[] }>(`/projects/${projectId}/linear-issues?search=${encodeURIComponent(search)}`)
    return response.data
  },

  async importLinearStories(projectId: string, issueKeys: string[]) {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/projects/${projectId}/linear-import`, { issueKeys })
    return response.data
  },

  async connectFigma(projectId: string, payload: { figmaFileUrl: string; figmaAccessToken?: string }) {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/projects/${projectId}/figma-connect`, payload)
    return response.data
  },

  async syncFigma(projectId: string) {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/projects/${projectId}/figma-sync`)
    return response.data
  }
}
