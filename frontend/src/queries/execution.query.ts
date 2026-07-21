'use client'

import { useQuery } from '@tanstack/react-query'
import { executionService } from '../services/executionService'
import { queryKeys } from '../lib/queryKeys'

/**
 * Execution history for a project.
 */
export function useExecutionHistoryQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.executions.byProject(projectId || ''),
    queryFn: async () => {
      const res = await executionService.getProjectExecutions(projectId!)
      return res.data || []
    },
    enabled: !!projectId,
  })
}

/**
 * Single execution run detail.
 */
export function useExecutionRunQuery(runId: string | null) {
  return useQuery({
    queryKey: queryKeys.executions.detail(runId || ''),
    queryFn: async () => {
      const res = await executionService.getExecutionRun(runId!)
      return res.data
    },
    enabled: !!runId,
  })
}
