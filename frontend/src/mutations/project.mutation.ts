'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { projectService } from '../services/projectService'
import { uploadService } from '../services/uploadService'
import { queryKeys } from '../lib/queryKeys'
import { toast } from 'sonner'

/** Delete a project and invalidate the projects list cache. */
export function useDeleteProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => projectService.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete project.')
    },
  })
}

/** Update project name/description. */
export function useUpdateProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, payload }: {
      projectId: string;
      payload: {
        projectName?: string;
        projectDescription?: string;
        slackChannelId?: string;
        slackChannelName?: string;
        slackConnected?: boolean;
      }
    }) =>
      projectService.updateProject(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      toast.success('Project details updated successfully! ✅')
    },
    onError: () => {
      toast.error('Failed to update project details.')
    },
  })
}

/** Assign users to a project. */
export function useAssignUsersMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, userIds }: { projectId: string; userIds: string[] }) =>
      projectService.assignUsers(projectId, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
    onError: (err: Error) => {
      console.error('Assignment failed', err)
    },
  })
}

/** Create a project (without file). */
export function useCreateProjectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      uploadService.createProjectOnly(name, description),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all })
      toast.success(`Project "${variables.name}" created successfully! 🎉`)
    },
    onError: (err: Error) => {
      console.error('Failed to create project', err)
    },
  })
}
