'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { executionService } from '../services/executionService'
import { queryKeys } from '../lib/queryKeys'

/** Start a new test execution run. */
export function useStartExecutionMutation() {
  return useMutation({
    mutationFn: (params: {
      projectId: string
      testSuiteId: string
      baseUrl: string
      headless: boolean
      testCaseIds?: string[]
    }) => executionService.startExecution(params),
    onError: (err: Error) => {
      console.error('Start execution failed', err)
    },
  })
}

/** Cancel a running execution. */
export function useCancelExecutionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (runId: string) => executionService.cancelExecution(runId),
    onSuccess: (_data, runId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.executions.detail(runId) })
    },
    onError: (err: Error) => {
      console.error('Cancel execution failed', err)
    },
  })
}
