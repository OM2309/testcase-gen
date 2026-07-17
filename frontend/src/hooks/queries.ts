'use client'

import { useQuery } from '@tanstack/react-query'
import { projectService } from '../services/projectService'
import { Project } from '../types'

/**
 * Projects list. Auto-refetches every 4s while any project is still being
 * analyzed so the status badge updates live.
 */
export function useProjectsQuery(search: string = '', page?: number, limit?: number) {
  return useQuery({
    queryKey: ['projects', search, page, limit],
    queryFn: async () => (await projectService.getAllProjects(search, page, limit)).data,
    refetchInterval: (query) => {
      const data = query.state.data as any
      const projects = data?.projects
      const analyzing = Array.isArray(projects) && projects.some((p: any) => p.status === 'analyzing')
      return analyzing ? 4000 : false
    }
  })
}
