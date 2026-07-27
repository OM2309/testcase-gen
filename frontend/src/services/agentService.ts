import { apiClient } from './apiClient'

export const agentService = {
  async analyzeScore(projectId: string, srsDocumentId?: string) {
    const url = srsDocumentId
      ? `/requirements/${projectId}/analyze-score/${srsDocumentId}`
      : `/requirements/${projectId}/analyze-score`
    const response = await apiClient.post<{ success: boolean; data: any }>(url)
    return response.data
  },

  async generateRequirements(projectId: string, srsDocumentId?: string, mode: string = 'srs_only') {
    const url = srsDocumentId
      ? `/requirements/${projectId}/generate/${srsDocumentId}`
      : `/requirements/${projectId}/generate`
    const response = await apiClient.post<{ success: boolean; data: any }>(url, { mode })
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
  },

  async aiGenerateTestCase(projectId: string, requirement: string, module?: string, priority?: string) {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      `/test-suites/ai-generate/${projectId}`,
      { requirement, module, priority }
    )
    return response.data
  },

  async aiUpdateTestCaseSteps(projectId: string, payload: { testCase: any; instructions: string; screenshot?: string | null }) {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      `/test-suites/ai-update-steps/${projectId}`,
      payload
    )
    return response.data
  },

  async generateGapFill(projectId: string, srsDocumentId?: string) {
    const url = srsDocumentId
      ? `/requirements/gap-fill/${projectId}/${srsDocumentId}`
      : `/requirements/gap-fill/${projectId}`
    const response = await apiClient.post<{ success: boolean; data: any }>(url)
    return response.data
  },

  async requestTestSuiteApproval(projectId: string, suiteId: string) {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      `/test-suites/${projectId}/${suiteId}/request-approval`
    )
    return response.data
  },

  async reviewTestSuite(
    projectId: string,
    suiteId: string,
    status: 'approved' | 'rejected',
    comment: string,
    rejectedTestCases: Array<{ testCaseId: string; feedback: string }> = []
  ) {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      `/test-suites/${projectId}/${suiteId}/review`,
      { status, comment, rejectedTestCases }
    )
    return response.data
  },

  async resolveRejectionFeedback(
    projectId: string,
    suiteId: string,
    testCaseId: string,
    action: 'rejected_change' | 'manually_updated'
  ) {
    const response = await apiClient.patch<{ success: boolean; data: any }>(
      `/test-suites/${projectId}/${suiteId}/resolve-feedback`,
      { testCaseId, action }
    )
    return response.data
  },

  async aiResolveRejectionFeedback(
    projectId: string,
    suiteId: string,
    testCaseId: string
  ) {
    const response = await apiClient.post<{ success: boolean; data: any }>(
      `/test-suites/${projectId}/${suiteId}/ai-resolve-feedback`,
      { testCaseId }
    )
    return response.data
  }
}
