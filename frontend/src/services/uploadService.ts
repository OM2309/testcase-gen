import { apiClient } from './apiClient'

export interface UploadProjectResponse {
  success: boolean
  data: {
    _id: string
    projectName: string
    projectDescription: string
    originalFileName: string
    parsedText: string
    status: string
  }
}

export const uploadService = {
  async createProject(file: File, projectName: string, projectDescription: string) {
    const formData = new FormData()
    formData.append('srs', file)
    formData.append('projectName', projectName)
    formData.append('projectDescription', projectDescription)

    const response = await apiClient.post<UploadProjectResponse>('/projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }
}
