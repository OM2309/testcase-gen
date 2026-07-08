import { apiClient } from './apiClient'

export const agentService = {
  async generateRequirements(projectId: string, srsDocumentId?: string) {
    const url = srsDocumentId 
      ? `/requirements/generate/${projectId}/${srsDocumentId}` 
      : `/requirements/generate/${projectId}`
    const response = await apiClient.post<{ success: boolean; data: any }>(url)
    return response.data
  },

  async generateTestSuite(projectId: string, srsDocumentId?: string) {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      `/test-suites/generate/${projectId}`,
      { srsDocumentId }
    )
    return response.data
  },

  async saveTestSuite(projectId: string, suiteId: string, testCases: any[]) {
    const response = await apiClient.put<{ success: boolean; data: any }>(
      `/test-suites/${projectId}/${suiteId}`,
      { testCases }
    )
    return response.data
  },

  async toggleTestCaseRegressive(projectId: string, suiteId: string, testCaseId: string) {
    const response = await apiClient.patch<{ success: boolean; data: any }>(
      `/test-suites/${projectId}/${suiteId}/test-cases/${testCaseId}/regressive`
    )
    return response.data
  }
}
