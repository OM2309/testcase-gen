import { apiClient } from './apiClient'

export interface SrsDocument {
  _id: string
  originalFileName: string
  filePath: string
  parsedText: string
  uploadedAt: string
}

export interface ProjectData {
  _id: string
  projectName: string
  projectDescription: string
  originalFileName: string
  parsedText: string
  status: string
  srsDocuments: SrsDocument[]
}

export interface UploadProjectResponse {
  success: boolean
  data: ProjectData
}

export const uploadService = {
  /** Legacy: create project with file in one shot */
  async createProject(file: File, projectName: string, projectDescription: string) {
    const formData = new FormData()
    formData.append('srs', file)
    formData.append('projectName', projectName)
    formData.append('projectDescription', projectDescription)

    const response = await apiClient.post<UploadProjectResponse>('/projects', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

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
