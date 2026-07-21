'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TestCase, FeatureGroup, ModuleGroup, RunTarget } from '../types'
import { executionService } from '../services/executionService'
import { useProject } from '../contexts/ProjectContext'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { RunConfigDialog, PageLoader, EmptyState } from '@/components/shared'
import { OverviewDashboard, DetailView } from '@/components/module-explorer'
import { Layers } from 'lucide-react'

export function ModuleExplorerView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedSrsId = searchParams.get('srsId')
  const {
    project,
    requirementAnalyses,
    testSuites,
    loading,
    agentRunning,
    agentError,
    runAgent1,
    runAgent2,
    refreshProject,
  } = useProject()

  // Dashboard tab: 'srs' | 'jira' | 'linear'
  const [dashboardTab, setDashboardTab] = useState<'srs' | 'jira' | 'linear'>('srs')
  const [activeModuleName, setActiveModuleName] = useState<string | null>(null)
  const [runningActionDocId, setRunningActionDocId] = useState<string | null>(null)

  // Execution config modal
  const [isRunOpen, setIsRunOpen] = useState(false)
  const [runTarget, setRunTarget] = useState<RunTarget | null>(null)
  const [runBaseUrl, setRunBaseUrl] = useState('http://localhost:3000')
  const [runHeadless, setRunHeadless] = useState(true)
  const [starting, setStarting] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  /* ─── Computed Data ─── */

  const srsDocumentsList = useMemo(() => {
    if (!project) return []
    if (project.srsDocuments && project.srsDocuments.length > 0) {
      return project.srsDocuments
    }
    if (project.originalFileName) {
      return [
        {
          _id: 'legacy',
          originalFileName: project.originalFileName,
          filePath: '',
          parsedText: project.parsedText || '',
          uploadedAt: project.createdAt,
        },
      ]
    }
    return []
  }, [project])

  const srsDocs = useMemo(
    () =>
      srsDocumentsList.filter(
        (d: any) => d.filePath !== 'virtual://jira' && d.filePath !== 'virtual://linear'
      ),
    [srsDocumentsList]
  )
  const jiraDocs = useMemo(
    () => srsDocumentsList.filter((d: any) => d.filePath === 'virtual://jira'),
    [srsDocumentsList]
  )
  const linearDocs = useMemo(
    () => srsDocumentsList.filter((d: any) => d.filePath === 'virtual://linear'),
    [srsDocumentsList]
  )

  const selectedSrs = useMemo(() => {
    return srsDocumentsList.find((d: any) => d._id === selectedSrsId)
  }, [selectedSrsId, srsDocumentsList])

  const getSrsTreeData = (srsId: string): ModuleGroup[] => {
    const analysis = requirementAnalyses.find(
      (r: any) => r.srsDocumentId === (srsId === 'legacy' ? null : srsId)
    )
    const suite = testSuites.find(
      (t: any) => t.srsDocumentId === (srsId === 'legacy' ? null : srsId)
    )
    if (!analysis || !analysis.analyzedData) return []

    const testCases = suite?.testCases || []
    return (analysis.analyzedData.modules || []).map((m: any) => {
      const features: FeatureGroup[] = (m.features || []).map((f: any) => {
        const matchingTcs = testCases.filter(
          (tc: any) => tc.module === m.module_name && tc.feature === f.feature_name
        )
        return { name: f.feature_name, description: f.description, testCases: matchingTcs }
      })
      const totalTcs = features.reduce(
        (acc: number, f: FeatureGroup) => acc + f.testCases.length,
        0
      )
      return { name: m.module_name, description: m.description, features, testCasesCount: totalTcs }
    })
  }

  const selectedSrsModules = useMemo((): ModuleGroup[] => {
    if (!selectedSrs) return []
    return getSrsTreeData(selectedSrs._id)
  }, [selectedSrs, requirementAnalyses, testSuites])

  useEffect(() => {
    if (selectedSrsModules.length > 0) {
      if (
        !activeModuleName ||
        !selectedSrsModules.some((m: ModuleGroup) => m.name === activeModuleName)
      ) {
        setActiveModuleName(selectedSrsModules[0].name)
      }
    } else {
      setActiveModuleName(null)
    }
  }, [selectedSrsModules, activeModuleName])

  const selectedAnalysis = useMemo(() => {
    if (!selectedSrs) return null
    const targetSrsId = selectedSrs._id === 'legacy' ? null : selectedSrs._id
    return requirementAnalyses.find((r: any) => r.srsDocumentId === targetSrsId) || null
  }, [selectedSrs, requirementAnalyses])

  const selectedSuite = useMemo(() => {
    if (!selectedSrs) return null
    const targetSrsId = selectedSrs._id === 'legacy' ? null : selectedSrs._id
    return testSuites.find((t: any) => t.srsDocumentId === targetSrsId) || null
  }, [selectedSrs, testSuites])

  /* ─── Handlers ─── */

  const handleLocalRunAgent1 = async (docId: string) => {
    setRunningActionDocId(docId)
    try {
      await runAgent1(docId)
    } finally {
      setRunningActionDocId(null)
    }
  }

  const handleLocalRunAgent2 = async (docId: string) => {
    setRunningActionDocId(docId)
    try {
      await runAgent2(docId)
    } finally {
      setRunningActionDocId(null)
    }
  }

  const handleDownloadExcel = (fileName: string, modules: ModuleGroup[]) => {
    const data: any[] = []
    modules.forEach((m) => {
      m.features.forEach((f: FeatureGroup) => {
        f.testCases.forEach((tc: any) => {
          data.push({
            Module: m.name,
            Feature: f.name,
            'Test Case ID': tc.id,
            Title: tc.title,
            Description: tc.description,
            'Scenario Type': tc.scenario_type,
            Steps: tc.steps ? tc.steps.join('\n') : '',
            'Playwright Steps': tc.playwrightSteps ? tc.playwrightSteps.join('\n') : '',
          })
        })
      })
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'TestCases')
    XLSX.writeFile(wb, `${fileName.replace(/\.[^/.]+$/, '')}_testcases.xlsx`)
    toast.success('Excel file exported successfully!')
  }

  const handleOpenRunDialog = (
    type: 'project' | 'module' | 'feature' | 'testcase' | 'srs',
    name: string,
    testCases: TestCase[],
    suiteId?: string
  ) => {
    const ids = testCases.map((tc) => tc.id)
    if (ids.length === 0 || !suiteId) return
    setRunTarget({ type, name, ids, suiteId })
    setRunError(null)
    setIsRunOpen(true)
  }

  const handleStartRun = async () => {
    if (!runTarget || !project) return
    setRunError(null)
    if (!/^https?:\/\//i.test(runBaseUrl.trim())) {
      setRunError('Base URL must start with http:// or https://')
      return
    }
    try {
      setStarting(true)
      const res = await executionService.startExecution({
        projectId: project._id,
        testSuiteId: runTarget.suiteId!,
        baseUrl: runBaseUrl.trim(),
        headless: runHeadless,
        testCaseIds: runTarget.ids,
      })
      if (res.success) {
        setIsRunOpen(false)
        router.push(`/dashboard/${project._id}/execution?runId=${res.data.runId}`)
      }
    } catch (err: any) {
      setRunError(err?.response?.data?.error || err?.message || 'Failed to start execution')
    } finally {
      setStarting(false)
    }
  }

  /* ─── Loading / Not Found ─── */

  if (loading && !project) {
    return <PageLoader message="Loading project details…" />
  }

  if (!project) {
    return <EmptyState icon={Layers} title="Project not found" />
  }

  /* ─── Render ─── */

  return (
    <div className="space-y-6">
      <RunConfigDialog
        open={isRunOpen}
        onOpenChange={setIsRunOpen}
        runTarget={runTarget}
        runBaseUrl={runBaseUrl}
        setRunBaseUrl={setRunBaseUrl}
        runHeadless={runHeadless}
        setRunHeadless={setRunHeadless}
        starting={starting}
        runError={runError}
        onStartRun={handleStartRun}
      />

      {selectedSrs ? (
        <DetailView
          selectedSrs={selectedSrs}
          selectedSrsModules={selectedSrsModules}
          selectedAnalysis={selectedAnalysis}
          selectedSuite={selectedSuite}
          activeModuleName={activeModuleName}
          setActiveModuleName={setActiveModuleName}
          projectId={project._id}
          agentRunning={agentRunning}
          runningActionDocId={runningActionDocId}
          onRunAgent2={handleLocalRunAgent2}
          onExportExcel={handleDownloadExcel}
          onOpenRunDialog={handleOpenRunDialog}
        />
      ) : (
        <OverviewDashboard
          project={project}
          dashboardTab={dashboardTab}
          setDashboardTab={setDashboardTab}
          srsDocs={srsDocs}
          jiraDocs={jiraDocs}
          linearDocs={linearDocs}
          requirementAnalyses={requirementAnalyses}
          testSuites={testSuites}
          agentError={agentError}
          agentRunning={agentRunning}
          runningActionDocId={runningActionDocId}
          onRunAgent1={handleLocalRunAgent1}
          onRunAgent2={handleLocalRunAgent2}
          onRefreshProject={refreshProject}
        />
      )}
    </div>
  )
}
