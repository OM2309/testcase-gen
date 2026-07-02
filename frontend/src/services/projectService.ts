import { apiClient } from './apiClient'

export interface Project {
  _id: string
  projectName: string
  projectDescription: string
  documentName: string
  originalFileName: string
  status: 'uploaded' | 'analyzing' | 'completed' | 'failed'
  totalModules: number
  errorMessage?: string
  createdAt: string
  processingCompletedAt?: string
  hasTestSuite?: boolean
  testCasesCount?: number
}

export const projectService = {
  async getAllProjects(status?: string, page = 1, limit = 50) {
    const params: any = { page, limit }
    if (status) params.status = status
    const response = await apiClient.get<{ success: boolean; data: Project[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>('/projects', { params })
    return response.data
  },

  async getProjectStatus(id: string) {
    const response = await apiClient.get<{ success: boolean; data: Project }>(`/project/${id}/status`)
    return response.data
  },

  async getProjectAnalysis(id: string) {
    const response = await apiClient.get<{ success: boolean; data: any }>(`/project/${id}/analysis`)
    return response.data
  },

  async deleteProject(id: string) {
    const response = await apiClient.delete<{ success: boolean; data: { message: string } }>(`/project/${id}`)
    return response.data
  }
}
