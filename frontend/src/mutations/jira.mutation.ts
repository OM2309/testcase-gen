'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '../services/projectService'
import { queryKeys } from '../lib/queryKeys'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

/** Connect Jira to a project. */
export function useConnectJiraMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { host: string; email: string; token: string; projectKey: string }) =>
      projectService.connectJira(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success('Successfully connected to Jira Project! 🔗')
    },
    onError: (err: unknown) => {
      const msg = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || 'Connection to Jira failed. Please verify credentials.'
      toast.error(msg)
    },
  })
}

/** Disconnect Jira from a project. */
export function useDisconnectJiraMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      projectService.connectJira(projectId, { host: '', email: '', token: '', projectKey: '', disconnect: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.info('Disconnected Jira account successfully.')
    },
    onError: () => {
      toast.error('Failed to disconnect Jira.')
    },
  })
}

/** Import selected Jira stories. */
export function useImportJiraStoriesMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (issueKeys: string[]) =>
      projectService.importJiraStories(projectId, issueKeys),
    onSuccess: (_data, issueKeys) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success(`Imported ${issueKeys.length} user stories. AI parsing initiated! 🚀`)
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.8 } })
    },
    onError: (err: unknown) => {
      const msg = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || 'Import failed.'
      toast.error(msg)
    },
  })
}
