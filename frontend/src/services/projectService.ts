import { apiClient } from './apiClient'
import { Project, ProjectDetail } from '../types'

export const projectService = {
  async getAllProjects() {
    const response = await apiClient.get<{ success: boolean; data: Project[] }>('/projects')
    return response.data
  },

  async getProjectById(id: string) {
    const response = await apiClient.get<{ success: boolean; data: ProjectDetail }>(`/projects/${id}`)
    return response.data
  },

  async deleteProject(id: string) {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/projects/${id}`)
    return response.data
  }
}
