'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '../services/projectService'
import { queryKeys } from '../lib/queryKeys'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

/** Connect Linear to a project. */
export function useConnectLinearMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { apiKey: string; teamId: string }) =>
      projectService.connectLinear(projectId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success(`Successfully connected to Linear Team "${variables.teamId}"! ⚡`)
    },
    onError: (err: unknown) => {
      const msg = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || 'Connection to Linear failed. Please verify credentials.'
      toast.error(msg)
    },
  })
}

/** Disconnect Linear from a project. */
export function useDisconnectLinearMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      projectService.connectLinear(projectId, { apiKey: '', teamId: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.info('Disconnected Linear workspace successfully.')
    },
    onError: () => {
      toast.error('Failed to disconnect Linear.')
    },
  })
}

/** Import selected Linear stories. */
export function useImportLinearStoriesMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (issueKeys: string[]) =>
      projectService.importLinearStories(projectId, issueKeys),
    onSuccess: (_data, issueKeys) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success(`Imported ${issueKeys.length} Linear user stories. AI parsing initiated! 🚀`)
      confetti({ particleCount: 100, spread: 60, origin: { y: 0.8 } })
    },
    onError: (err: unknown) => {
      const msg = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || 'Import failed.'
      toast.error(msg)
    },
  })
}
