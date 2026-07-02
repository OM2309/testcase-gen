import { apiClient } from './apiClient'

export const agentService = {
  async generateRequirements(projectId: string) {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      `/requirements/generate/${projectId}`
    )
    return response.data
  },

  async generateTestSuite(projectId: string) {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      `/test-suites/generate/${projectId}`
    )
    return response.data
  },

  async saveTestSuite(projectId: string, testCases: any[]) {
    const response = await apiClient.put<{ success: boolean; data: any }>(
      `/test-suites/${projectId}`,
      { testCases }
    )
    return response.data
  }
}
