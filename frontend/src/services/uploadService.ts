import { apiClient } from './apiClient'

export interface UploadResponse {
  success: boolean
  documentId: string
  fileName: string
  text: string
}

export const uploadService = {
  async uploadSRS(file: File) {
    const formData = new FormData()
    formData.append('srs', file)

    const response = await apiClient.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }
}
