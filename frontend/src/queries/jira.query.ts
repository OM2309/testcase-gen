'use client'

import { useQuery } from '@tanstack/react-query'
import { projectService } from '../services/projectService'
import { queryKeys } from '../lib/queryKeys'

/**
 * Jira issues list for a project with debounced search.
 */
export function useJiraIssuesQuery(projectId: string, search: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.jira.issues(projectId, search),
    queryFn: async () => {
      const res = await projectService.getJiraIssues(projectId, search)
      return res.data || []
    },
    enabled,
  })
}
