'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Project, RequirementAnalysis, TestSuiteData } from '../types'
import { projectService } from '../services/projectService'
import { agentService } from '../services/agentService'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

interface ProjectContextType {
  project: Project | null
  selectedSrsId: string | null
  setSelectedSrsId: (id: string | null) => void
  requirementAnalyses: RequirementAnalysis[]
  testSuites: TestSuiteData[]
  loading: boolean
  error: string | null
  agentRunning: 'agent1' | 'agent2' | null
  agentError: string | null
  runAgent1: (srsId?: string) => Promise<void>
  runAgent2: (srsId?: string) => Promise<void>
  refreshProject: () => Promise<void>
  setProject: React.Dispatch<React.SetStateAction<Project | null>>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { projectId } = useParams() as { projectId?: string }
  const [project, setProject] = useState<Project | null>(null)
  const [selectedSrsId, setSelectedSrsId] = useState<string | null>(null)
  const [requirementAnalyses, setRequirementAnalyses] = useState<RequirementAnalysis[]>([])
  const [testSuites, setTestSuites] = useState<TestSuiteData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentRunning, setAgentRunning] = useState<'agent1' | 'agent2' | null>(null)
  const [agentError, setAgentError] = useState<string | null>(null)

  const refreshProject = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const res = await projectService.getProjectById(projectId)
      if (res.success) {
        setProject(res.data.project)
        setRequirementAnalyses(res.data.requirementAnalyses || [])
        setTestSuites(res.data.testSuites || [])

        // Set default selected SRS ID if not set
        const docs = res.data.project.srsDocuments || []
        if (docs.length > 0) {
          setSelectedSrsId(prev => {
            if (prev && docs.some(d => d._id === prev)) return prev
            return docs[0]._id
          })
        } else {
          setSelectedSrsId(null)
        }
      }
    } catch (err: any) {
      console.error('Failed to load project details', err)
      setError(err?.response?.data?.message || 'Failed to fetch project details')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    refreshProject()
  }, [refreshProject])

  const runAgent1 = async (srsId?: string) => {
    if (!projectId || agentRunning) return
    const targetSrsId = srsId || selectedSrsId || undefined
    setAgentError(null)
    setAgentRunning('agent1')
    try {
      const res = await agentService.generateRequirements(projectId, targetSrsId)
      if (res.success) {
        await refreshProject()
        toast.success("Agent 1 analysis completed successfully! ✨")
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        })
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Agent 1 analysis failed. Please try again.'
      setAgentError(msg)
      toast.error('Agent 1 analysis failed.')
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
      const res = await agentService.generateTestSuite(projectId, targetSrsId)
      if (res.success) {
        await refreshProject()
        toast.success("Agent 2 successfully generated the test suite! 🚀")
        
        // Celebratory side splashes
        const end = Date.now() + (2 * 1000)
        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          })
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          })
          if (Date.now() < end) {
            requestAnimationFrame(frame)
          }
        }
        frame()
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Agent 2 test generation failed. Please try again.'
      setAgentError(msg)
      toast.error('Agent 2 test generation failed.')
    } finally {
      setAgentRunning(null)
    }
  }

  return (
    <ProjectContext.Provider value={{
      project,
      selectedSrsId,
      setSelectedSrsId,
      requirementAnalyses,
      testSuites,
      loading,
      error,
      agentRunning,
      agentError,
      runAgent1,
      runAgent2,
      refreshProject,
      setProject
    }}>
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
