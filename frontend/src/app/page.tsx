'use client'

import React, { useState, useEffect } from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { ProjectsListView } from '../components/ProjectsListView'
import { UploadView } from '../components/UploadView'
import { RequirementsView } from '../components/RequirementsView'
import { TestCasesView } from '../components/TestCasesView'
import { ExecutionView } from '../components/ExecutionView'
import { projectService } from '../services/projectService'
import { agentService } from '../services/agentService'
import { Project } from '../types'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'projects' | 'upload' | 'requirements' | 'testcases' | 'execution'>('projects')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [requirementsData, setRequirementsData] = useState<any>(null)
  const [testSuiteData, setTestSuiteData] = useState<any>(null)
  const [loadingProject, setLoadingProject] = useState(false)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  // Lifted here (not inside RequirementsView) so a running agent survives tab
  // switches — otherwise unmounting the view hides the progress and the user
  // thinks the job was cancelled.
  const [agentRunning, setAgentRunning] = useState<'agent1' | 'agent2' | null>(null)
  const [agentError, setAgentError] = useState<string | null>(null)

  useEffect(() => {
    const htmlElement = document.documentElement
    if (theme === 'dark') {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
  }, [theme])

  const handleSelectProject = async (projectId: string) => {
    setSelectedProjectId(projectId)
    setLoadingProject(true)
    try {
      const res = await projectService.getProjectById(projectId)
      if (res.success) {
        const { project, requirementAnalysis, testSuite } = res.data
        setSelectedProject(project)

        if (requirementAnalysis?.analyzedData) {
          setRequirementsData(requirementAnalysis.analyzedData)
        } else {
          setRequirementsData(null)
        }

        if (testSuite?.testCases?.length > 0) {
          setTestSuiteData(testSuite)
          setActiveTab('testcases')
        } else {
          setTestSuiteData(null)
          if (requirementAnalysis?.analyzedData) {
            setActiveTab('requirements')
          } else {
            setActiveTab('upload')
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch project details', err)
      setActiveTab('projects')
    } finally {
      setLoadingProject(false)
    }
  }

  const handleProjectCreated = async (projectId: string) => {
    setSelectedProjectId(projectId)
    setRequirementsData(null)
    setTestSuiteData(null)
    setActiveTab('requirements')
    // Load the project details
    try {
      const res = await projectService.getProjectById(projectId)
      if (res.success) {
        setSelectedProject(res.data.project)
      }
    } catch (err) {
      console.error('Failed to load new project', err)
    }
  }

  // Agent 1 — runs from page level so it keeps running (with a global
  // indicator) even if the user navigates to another tab.
  const runAgent1 = async () => {
    if (!selectedProjectId || agentRunning) return
    setAgentError(null)
    setAgentRunning('agent1')
    try {
      const res = await agentService.generateRequirements(selectedProjectId)
      if (res.success) {
        setRequirementsData(res.data.analyzedData)
        setActiveTab('requirements')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setAgentError(msg || 'Agent 1 analysis failed. Please try again.')
    } finally {
      setAgentRunning(null)
    }
  }

  // Agent 2 — same lifted pattern.
  const runAgent2 = async () => {
    if (!selectedProjectId || agentRunning) return
    setAgentError(null)
    setAgentRunning('agent2')
    try {
      const res = await agentService.generateTestSuite(selectedProjectId)
      if (res.success) {
        setTestSuiteData(res.data)
        setActiveTab('testcases')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setAgentError(msg || 'Agent 2 generation failed. Please try again.')
    } finally {
      setAgentRunning(null)
    }
  }

  const handleRunStarted = (runId: string) => {
    setActiveRunId(runId)
    setActiveTab('execution')
  }

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'projects': return 'Projects Repository'
      case 'upload': return 'New Project'
      case 'requirements': return 'Requirements Analysis'
      case 'testcases': return 'Test Suite Builder'
      case 'execution': return 'Test Execution'
      default: return 'Dashboard'
    }
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 60)",
        "--header-height": "calc(var(--spacing) * 14)",
      } as React.CSSProperties}
    >
      <AppSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasRequirements={!!requirementsData}
        hasTestSuite={!!testSuiteData}
        hasExecution={!!activeRunId}
        selectedProject={selectedProject}
        theme={theme}
        setTheme={setTheme}
      />
      <SidebarInset>
        <SiteHeader title={getBreadcrumb()} agentRunning={agentRunning} />
        <main className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
          {/* Persistent global indicator — survives tab switches so users know
              a long-running agent job is still in progress (not cancelled). */}
          {agentRunning && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <p className="text-xs font-medium text-foreground">
                {agentRunning === 'agent1' ? 'Agent 1 is analyzing requirements…' : 'Agent 2 is generating the test suite…'}
                <span className="text-muted-foreground"> You can keep browsing — results appear automatically when it finishes.</span>
              </p>
            </div>
          )}
          {activeTab === 'projects' && (
            <ProjectsListView
              onSelectProject={handleSelectProject}
              onNavigateToUpload={() => {
                setSelectedProjectId(null)
                setSelectedProject(null)
                setRequirementsData(null)
                setTestSuiteData(null)
                setActiveTab('upload')
              }}
            />
          )}

          {activeTab === 'upload' && (
            <UploadView onProjectCreated={handleProjectCreated} />
          )}

          {activeTab === 'requirements' && selectedProjectId && (
            <RequirementsView
              projectId={selectedProjectId}
              requirements={requirementsData}
              parsedText={selectedProject?.parsedText}
              agentRunning={agentRunning}
              agentError={agentError}
              onRunAgent1={runAgent1}
              onRunAgent2={runAgent2}
            />
          )}

          {activeTab === 'testcases' && testSuiteData && selectedProjectId && (
            <TestCasesView
              projectId={selectedProjectId}
              testSuiteId={testSuiteData._id}
              testCases={testSuiteData.testCases || []}
              onRunStarted={handleRunStarted}
              onSave={async (updatedCases) => {
                const { agentService } = await import('../services/agentService')
                const res = await agentService.saveTestSuite(selectedProjectId, updatedCases)
                if (res.success) {
                  setTestSuiteData(res.data)
                }
              }}
            />
          )}

          {activeTab === 'execution' && (
            <ExecutionView
              runId={activeRunId}
              onRunStarted={handleRunStarted}
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
