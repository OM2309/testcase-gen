'use client'

import React, { createContext, useContext, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Project, RequirementAnalysis, TestSuiteData } from '../types'
import { useProjectDetailQuery } from '../queries/project.query'
import {
  useRunAgent0Mutation,
  useRunAgent1Mutation,
  useRunAgent2Mutation,
  useRunGapFillMutation,
} from '../mutations/agent.mutation'
import { useProjectStore } from '../stores/useProjectStore'

interface ProjectContextType {
  project: Project | null
  selectedSrsId: string | null
  setSelectedSrsId: (id: string | null) => void
  requirementAnalyses: RequirementAnalysis[]
  testSuites: TestSuiteData[]
  loading: boolean
  error: string | null
  agentRunning: 'agent0' | 'agent1' | 'agent2' | 'gapfill' | null
  agentError: string | null
  runAgent0: (srsId?: string) => Promise<void>
  runAgent1: (srsId?: string) => Promise<void>
  runAgent2: (srsId?: string) => Promise<void>
  runGapFill: (srsId?: string) => Promise<void>
  refreshProject: () => Promise<void>
  setProject: (project: Project | null | ((prev: Project | null) => Project | null)) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

/**
 * Syncs TanStack Query project detail data into the Zustand store and provides agent execution methods.
 */
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams() as { projectId?: string }
  const { data, isLoading, isError, error: queryError, refetch } = useProjectDetailQuery(projectId)

  const {
    project,
    selectedSrsId,
    requirementAnalyses,
    testSuites,
    agentRunning,
    agentError,
    setProject,
    setSelectedSrsId,
    setRequirementAnalyses,
    setTestSuites,
    setLoading,
    setError,
    setAgentRunning,
    setAgentError,
  } = useProjectStore()

  // Mutations
  const agent0Mutation = useRunAgent0Mutation(projectId || '')
  const agent1Mutation = useRunAgent1Mutation(projectId || '')
  const agent2Mutation = useRunAgent2Mutation(projectId || '')
  const gapFillMutation = useRunGapFillMutation(projectId || '')

  useEffect(() => {
    setLoading(isLoading)
  }, [isLoading, setLoading])

  useEffect(() => {
    if (isError) {
      setError((queryError as Error)?.message || 'Failed to fetch project details')
    } else {
      setError(null)
    }
  }, [isError, queryError, setError])

  useEffect(() => {
    if (data) {
      setProject(data.project)
      setRequirementAnalyses(data.requirementAnalyses || [])
      setTestSuites(data.testSuites || [])

      const docs = data.project.srsDocuments || []
      if (docs.length > 0) {
        useProjectStore.setState((state) => {
          if (state.selectedSrsId && docs.some((d) => d._id === state.selectedSrsId)) {
            return state
          }
          return { ...state, selectedSrsId: docs[0]._id }
        })
      } else {
        setSelectedSrsId(null)
      }
    }
  }, [data, setProject, setRequirementAnalyses, setTestSuites, setSelectedSrsId])

  const runAgent0 = async (srsId?: string) => {
    if (!projectId || agentRunning) return
    const targetSrsId = srsId || selectedSrsId || undefined
    setAgentError(null)
    setAgentRunning('agent0')
    try {
      await agent0Mutation.mutateAsync(targetSrsId)
    } catch (err: any) {
      setAgentError(err?.response?.data?.message || 'Agent 0 analysis failed. Please try again.')
    } finally {
      setAgentRunning(null)
    }
  }

  const runAgent1 = async (srsId?: string) => {
    if (!projectId || agentRunning) return
    const targetSrsId = srsId || selectedSrsId || undefined
    setAgentError(null)
    setAgentRunning('agent1')
    try {
      await agent1Mutation.mutateAsync(targetSrsId)
    } catch (err: any) {
      setAgentError(err?.response?.data?.message || 'Agent 1 module extraction failed. Please try again.')
    } finally {
      setAgentRunning(null)
    }
  }

  const runAgent2 = async (srsId?: string) => {
    if (!projectId || agentRunning) return
    const targetSrsId = srsId || selectedSrsId || undefined
    setAgentError(null)
    setAgentRunning('agent2')
    try {
      await agent2Mutation.mutateAsync(targetSrsId)
    } catch (err: any) {
      setAgentError(err?.response?.data?.message || 'Agent 2 test generation failed. Please try again.')
    } finally {
      setAgentRunning(null)
    }
  }

  const runGapFill = async (srsId?: string) => {
    if (!projectId || agentRunning) return
    const targetSrsId = srsId || selectedSrsId || undefined
    setAgentError(null)
    setAgentRunning('gapfill')
    try {
      await gapFillMutation.mutateAsync(targetSrsId)
    } catch (err: any) {
      setAgentError(err?.response?.data?.message || 'Gap-fill analysis failed. Please try again.')
    } finally {
      setAgentRunning(null)
    }
  }

  const refreshProject = async () => {
    await refetch()
  }

  return (
    <ProjectContext.Provider
      value={{
        project,
        selectedSrsId,
        setSelectedSrsId,
        requirementAnalyses,
        testSuites,
        loading: isLoading,
        error: isError ? (queryError as Error)?.message || 'Failed to fetch project details' : null,
        agentRunning,
        agentError,
        runAgent0,
        runAgent1,
        runAgent2,
        runGapFill,
        refreshProject,
        setProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}
