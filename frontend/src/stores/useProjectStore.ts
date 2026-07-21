import { create } from 'zustand'
import { Project, RequirementAnalysis, TestSuiteData } from '../types'

export interface ProjectState {
  project: Project | null
  selectedSrsId: string | null
  requirementAnalyses: RequirementAnalysis[]
  testSuites: TestSuiteData[]
  loading: boolean
  error: string | null
  agentRunning: 'agent1' | 'agent2' | 'gapfill' | null
  agentError: string | null

  // Actions
  setProject: (project: Project | null | ((prev: Project | null) => Project | null)) => void
  setSelectedSrsId: (id: string | null) => void
  setRequirementAnalyses: (analyses: RequirementAnalysis[]) => void
  setTestSuites: (suites: TestSuiteData[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setAgentRunning: (running: 'agent1' | 'agent2' | 'gapfill' | null) => void
  setAgentError: (error: string | null) => void
  resetProjectState: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  selectedSrsId: null,
  requirementAnalyses: [],
  testSuites: [],
  loading: false,
  error: null,
  agentRunning: null,
  agentError: null,

  setProject: (project) =>
    set((state) => ({
      project: typeof project === 'function' ? project(state.project) : project,
    })),
  setSelectedSrsId: (selectedSrsId) => set({ selectedSrsId }),
  setRequirementAnalyses: (requirementAnalyses) => set({ requirementAnalyses }),
  setTestSuites: (testSuites) => set({ testSuites }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setAgentRunning: (agentRunning) => set({ agentRunning }),
  setAgentError: (agentError) => set({ agentError }),
  resetProjectState: () =>
    set({
      project: null,
      selectedSrsId: null,
      requirementAnalyses: [],
      testSuites: [],
      loading: false,
      error: null,
      agentRunning: null,
      agentError: null,
    }),
}))
