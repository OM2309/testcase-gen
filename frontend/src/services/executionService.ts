import { apiClient } from './apiClient'

export interface RunExecutionResponse {
  success: boolean
  runId: string
  status: string
}

export interface ExecutionReportResponse {
  success: boolean
  report: {
    _id: string
    suiteId: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    startedAt: string
    endedAt?: string
    summary: {
      total: number
      passed: number
      failed: number
      skipped: number
    }
    results: Array<{
      test_case_id: string
      title: string
      status: 'passed' | 'failed' | 'skipped'
      duration_ms: number
      steps: Array<{
        step_number: number
        action: string
        status: 'passed' | 'failed' | 'skipped'
        duration_ms: number
        message: string
        screenshot?: string
        error?: any
        recovery?: any
      }>
      artifacts: {
        screenshots: string[]
        video?: string
        trace?: string
      }
    }>
  }
}

export const executionService = {
  async runExecution(suiteId: string, baseUrl?: string, headless = true) {
    const response = await apiClient.post<RunExecutionResponse>('/execution/run', {
      suiteId,
      baseUrl,
      headless
    })
    return response.data
  },

  async getExecutionReport(runId: string) {
    const response = await apiClient.get<ExecutionReportResponse>(`/execution/${runId}/report`)
    return response.data
  },

  getStreamUrl(runId: string) {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    return `${API_BASE_URL}/stream/${runId}`
  }
}
