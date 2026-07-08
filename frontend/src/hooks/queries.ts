'use client'

import { useQuery } from '@tanstack/react-query'
import { projectService } from '../services/projectService'
import { Project } from '../types'

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
