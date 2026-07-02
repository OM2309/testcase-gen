'use client'

import React, { useState, useEffect } from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { ProjectsListView } from '../components/ProjectsListView'
import { UploadView } from '../components/UploadView'
import { RequirementsView } from '../components/RequirementsView'
import { TestCasesView } from '../components/TestCasesView'
import { ExecuteView } from '../components/ExecuteView'
import { projectService, Project } from '../services/projectService'
import { executionService } from '../services/executionService'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'projects' | 'upload' | 'requirements' | 'testcases' | 'execute'>('projects')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [requirementsData, setRequirementsData] = useState<any>(null)

  const [testSuiteId, setTestSuiteId] = useState<string | null>(null)
  const [testCasesList, setTestCasesList] = useState<any[]>([])

  const [currentRunId, setCurrentRunId] = useState<string | null>(null)

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
    setCurrentRunId(null)
    try {
      const statusRes = await projectService.getProjectStatus(projectId)
      if (statusRes.success) {
        setSelectedProject(statusRes.data)
      }

      const analysisRes = await projectService.getProjectAnalysis(projectId)
      let hasReq = false
      if (analysisRes.success && analysisRes.data) {
        setRequirementsData(analysisRes.data)
        hasReq = true
      } else {
        setRequirementsData(null)
      }

      const suiteRes = await executionService.getTestSuiteByProject(projectId)
      if (suiteRes.success && suiteRes.testSuiteId && suiteRes.testCases && suiteRes.testCases.length > 0) {
        setTestSuiteId(suiteRes.testSuiteId)
        setTestCasesList(suiteRes.testCases)
        setActiveTab('testcases')
      } else {
        setTestSuiteId(null)
        setTestCasesList([])
        if (hasReq) {
          setActiveTab('requirements')
        } else {
          setActiveTab('upload')
        }
      }
    } catch (err) {
      console.error('Failed to fetch project analysis or test suite', err)
      setActiveTab('projects')
    }
  }

  const handleAnalysisComplete = (projectId: string, requirements: any) => {
    setSelectedProjectId(projectId)
    setRequirementsData(requirements)
    setActiveTab('requirements')

    projectService.getProjectStatus(projectId).then(res => {
      if (res.success) setSelectedProject(res.data)
    })
  }

  const handleTestCasesGenerated = (suiteId: string, testCases: any[]) => {
    setTestSuiteId(suiteId)
    setTestCasesList(testCases)
    setActiveTab('testcases')
  }

  const handleRunTestSuite = async (baseUrl: string, headless: boolean) => {
    if (!testSuiteId) return
    try {
      const res = await executionService.runExecution(testSuiteId, baseUrl, headless)
      if (res.success) {
        setCurrentRunId(res.runId)
        setActiveTab('execute')
      }
    } catch (err) {
      console.error('Failed to launch Playwright runner', err)
    }
  }

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'projects':
        return 'Projects Repository'
      case 'upload':
        return 'PRD Upload Workspace'
      case 'requirements':
        return 'Requirements Analysis'
      case 'testcases':
        return 'TestSuite Builder'
      case 'execute':
        return 'Live Run Monitor'
      default:
        return 'Dashboard'
    }
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 16)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasRequirements={!!requirementsData}
        hasTestSuite={testCasesList.length > 0}
        hasRunId={!!currentRunId}
        selectedProject={selectedProject}
        theme={theme}
        setTheme={setTheme}
      />
      <SidebarInset>
        <SiteHeader title={getBreadcrumb()} />
        <main className="flex flex-1 flex-col overflow-y-auto px-8 py-6">
          {activeTab === 'projects' && (
            <ProjectsListView
              onSelectProject={handleSelectProject}
              onNavigateToUpload={() => {
                setSelectedProjectId(null)
                setSelectedProject(null)
                setRequirementsData(null)
                setActiveTab('upload')
              }}
            />
          )}

          {activeTab === 'upload' && (
            <UploadView onAnalysisComplete={handleAnalysisComplete} />
          )}

          {activeTab === 'requirements' && selectedProjectId && (
            <RequirementsView
              projectId={selectedProjectId}
              requirements={requirementsData}
              onTestCasesGenerated={handleTestCasesGenerated}
            />
          )}

          {activeTab === 'testcases' && testSuiteId && (
            <TestCasesView
              testSuiteId={testSuiteId}
              testCases={testCasesList}
              onRunTestSuite={handleRunTestSuite}
            />
          )}

          {activeTab === 'execute' && currentRunId && (
            <ExecuteView
              runId={currentRunId}
              testCases={testCasesList}
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
