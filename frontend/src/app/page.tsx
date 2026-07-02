'use client'

import React, { useState, useEffect } from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { ProjectsListView } from '../components/ProjectsListView'
import { UploadView } from '../components/UploadView'
import { RequirementsView } from '../components/RequirementsView'
import { TestCasesView } from '../components/TestCasesView'
import { projectService } from '../services/projectService'
import { Project } from '../types'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'projects' | 'upload' | 'requirements' | 'testcases'>('projects')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [requirementsData, setRequirementsData] = useState<any>(null)
  const [testSuiteData, setTestSuiteData] = useState<any>(null)
  const [loadingProject, setLoadingProject] = useState(false)

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

  const handleRequirementsGenerated = (analysisData: any) => {
    setRequirementsData(analysisData)
    setActiveTab('requirements')
  }

  const handleTestCasesGenerated = (suiteData: any) => {
    setTestSuiteData(suiteData)
    setActiveTab('testcases')
  }

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'projects': return 'Projects Repository'
      case 'upload': return 'New Project'
      case 'requirements': return 'Requirements Analysis'
      case 'testcases': return 'Test Suite Builder'
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
        selectedProject={selectedProject}
        theme={theme}
        setTheme={setTheme}
      />
      <SidebarInset>
        <SiteHeader title={getBreadcrumb()} />
        <main className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
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
              onRequirementsGenerated={handleRequirementsGenerated}
              onTestCasesGenerated={handleTestCasesGenerated}
            />
          )}

          {activeTab === 'testcases' && testSuiteData && selectedProjectId && (
            <TestCasesView
              projectId={selectedProjectId}
              testSuiteId={testSuiteData._id}
              testCases={testSuiteData.testCases || []}
              onSave={async (updatedCases) => {
                const { agentService } = await import('../services/agentService')
                const res = await agentService.saveTestSuite(selectedProjectId, updatedCases)
                if (res.success) {
                  setTestSuiteData(res.data)
                }
              }}
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
