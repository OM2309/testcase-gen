import { apiClient } from './apiClient'
import { SrsDocument, Project } from '../types'

export interface UploadProjectResponse {
  success: boolean
  data: {
    _id: string
    projectName: string
    projectDescription: string
    originalFileName: string
    parsedText: string
    status: string
    srsDocuments: SrsDocument[]
  }
}

export const uploadService = {
  /** Create project with name + description only (no file) */
  async createProjectOnly(projectName: string, projectDescription: string) {
    const response = await apiClient.post<UploadProjectResponse>('/projects/create', {
      projectName,
      projectDescription
    })
    return response.data
  },

  /** Add an SRS document to an existing project */
  async addSrsToProject(projectId: string, file: File) {
    const formData = new FormData()
    formData.append('srs', file)

    const response = await apiClient.post<UploadProjectResponse>(
      `/projects/${projectId}/srs`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  }
}
