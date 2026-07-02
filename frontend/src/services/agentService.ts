import { apiClient } from './apiClient'

export interface AnalyzeResponse {
  success: boolean
  requirementId: string
  requirements: any
}

export interface GenerateTestCasesResponse {
  success: boolean
  testSuiteId: string
  testCases: any[]
}

export const agentService = {
  async analyzePRD(documentId: string, text?: string) {
    const response = await apiClient.post<AnalyzeResponse>('/agent/analyze', {
      documentId,
      text
    })
    return response.data
  },

  async generateTestCases(requirementId: string, requirements?: any) {
    const response = await apiClient.post<GenerateTestCasesResponse>('/agent/testcases', {
      requirementId,
      requirements
    })
    return response.data
  }
}
