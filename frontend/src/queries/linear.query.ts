'use client'

import { useQuery } from '@tanstack/react-query'
import { projectService } from '../services/projectService'
import { queryKeys } from '../lib/queryKeys'

/**
 * Linear issues list for a project with debounced search.
 */
export function useLinearIssuesQuery(projectId: string, search: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.linear.issues(projectId, search),
    queryFn: async () => {
      const res = await projectService.getLinearIssues(projectId, search)
      return res.data || []
    },
    enabled,
  })
}
