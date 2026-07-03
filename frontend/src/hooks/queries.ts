'use client'

import { useQuery } from '@tanstack/react-query'
import { projectService } from '../services/projectService'
import { executionService } from '../services/executionService'
import { Project, TestRun } from '../types'

/**
 * Projects list. Auto-refetches every 4s while any project is still being
 * analyzed so the status badge updates live.
 */
export function useProjectsQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await projectService.getAllProjects()).data,
    refetchInterval: (query) => {
      const data = query.state.data as Project[] | undefined
      const analyzing = Array.isArray(data) && data.some((p) => p.status === 'analyzing')
      return analyzing ? 4000 : false
    }
  })
}

/**
 * A single execution run. Polls every 2.5s while the run is active and stops
 * automatically once it reaches a terminal state (completed | failed).
 */
export function useExecutionRunQuery(runId: string | null) {
  return useQuery({
    queryKey: ['execution', runId],
    enabled: !!runId,
    queryFn: async () => (await executionService.getExecutionRun(runId as string)).data,
    refetchInterval: (query) => {
      const data = query.state.data as TestRun | undefined
      if (!data) return 2500
      return data.status === 'completed' || data.status === 'failed' ? false : 2500
    }
  })
}
