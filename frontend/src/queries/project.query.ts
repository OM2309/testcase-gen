'use client'

import { useQuery } from '@tanstack/react-query'
import { projectService } from '../services/projectService'
import { queryKeys } from '../lib/queryKeys'

/**
 * Projects list with search + pagination.
 * Auto-refetches every 4s while any project is still being analyzed.
 */
export function useProjectsQuery(search: string = '', page?: number, limit?: number) {
  return useQuery({
    queryKey: queryKeys.projects.list(search, page, limit),
    queryFn: async () => (await projectService.getAllProjects(search, page, limit)).data,
    refetchInterval: (query) => {
      const data = query.state.data as Record<string, unknown> | undefined
      const projects = data?.projects
      const analyzing = Array.isArray(projects) && projects.some((p: Record<string, unknown>) => p.status === 'analyzing')
      return analyzing ? 4000 : false
    }
  })
}

/**
 * Single project detail — includes project, requirementAnalyses, and testSuites.
 */
export function useProjectDetailQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId || ''),
    queryFn: async () => {
      const res = await projectService.getProjectById(projectId!)
      return res.data
    },
    enabled: !!projectId,
  })
}

/**
 * All projects list (no pagination) — used by sidebar.
 */
export function useAllProjectsQuery() {
  return useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: async () => {
      const res = await projectService.getAllProjects()
      return res.data?.projects || []
    },
  })
}
