import { apiClient } from './apiClient'

export interface Project {
  _id: string
  projectName: string
  projectDescription: string
  documentName: string
  originalFileName: string
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'tests_generated' | 'failed'
  errorMessage?: string
  createdAt: string
  processingCompletedAt?: string
  hasTestSuite?: boolean
  testCasesCount?: number
  parsedText?: string
}

export interface ProjectDetail {
  project: Project
  requirementAnalysis: any | null
  testSuite: any | null
}

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
