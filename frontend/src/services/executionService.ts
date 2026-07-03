import { apiClient } from './apiClient'
import { TestRun, StartExecutionParams } from '../types'

/**
 * Server origin (without the /api suffix). Used to build absolute URLs for
 * statically served assets like failure screenshots (/uploads/test-runs/...).
 */
export const SERVER_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
).replace(/\/api\/?$/, '')

/**
 * Builds an absolute URL for a server-served asset path (e.g. a screenshot).
 * Returns an empty string when no path is provided.
 */
export function getAssetUrl(assetPath?: string): string {
  if (!assetPath) return ''
  if (/^https?:\/\//i.test(assetPath)) return assetPath
  return `${SERVER_ORIGIN}${assetPath.startsWith('/') ? '' : '/'}${assetPath}`
}

export const executionService = {
  /**
   * Starts a new test execution run. Returns the runId immediately;
   * the backend continues executing asynchronously.
   */
  async startExecution(params: StartExecutionParams) {
    const response = await apiClient.post<{ success: boolean; runId: string; message: string }>(
      '/executions/start',
      params
    )
    return response.data
  },

  /**
   * Fetches the full execution run (used for polling).
   */
  async getExecutionRun(runId: string) {
    const response = await apiClient.get<{ success: boolean; data: TestRun }>(
      `/executions/${runId}`
    )
    return response.data
  },

  /**
   * Fetches execution history for a project.
   */
  async getProjectExecutions(projectId: string) {
    const response = await apiClient.get<{ success: boolean; data: TestRun[] }>(
      `/executions/project/${projectId}`
    )
    return response.data
  }
}
