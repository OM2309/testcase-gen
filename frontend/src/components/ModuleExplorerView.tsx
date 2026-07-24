'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TestCase, FeatureGroup, ModuleGroup, RunTarget, SuggestedTestCase } from '../types'
import { executionService } from '../services/executionService'
import { agentService } from '../services/agentService'
import { useProject } from '../contexts/ProjectContext'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { RunConfigDialog, PageLoader, EmptyState } from '@/components/shared'
import { OverviewDashboard, DetailView, MissingTestCasesModal } from '@/components/module-explorer'
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
    runAgent0,
    runAgent1,
    runAgent2,
    runGapFill,
    refreshProject,
  } = useProject()

  // Dashboard tab: 'srs' | 'jira' | 'linear'
  const [dashboardTab, setDashboardTab] = useState<'srs' | 'jira' | 'linear'>('srs')
  const [activeModuleName, setActiveModuleName] = useState<string | null>(null)
  const [runningActionDocId, setRunningActionDocId] = useState<string | null>(null)
  const [isGapFillOpen, setIsGapFillOpen] = useState(false)

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
    if (selectedSrsId === 'figma-design' && project) {
      // Create virtual Figma doc entry for detail view
      const frameCount = project.figmaSyncedFrames?.length || 0
      return {
        _id: 'figma-design',
        originalFileName: `Figma Designs (${frameCount} screens)`,
        filePath: 'virtual://figma',
        parsedText: '',
        uploadedAt: project.createdAt,
      }
    }
    return srsDocumentsList.find((d: any) => d._id === selectedSrsId)
  }, [selectedSrsId, srsDocumentsList, project])

  const getSrsTreeData = (srsId: string): ModuleGroup[] => {
    const mappedId = (srsId === 'legacy' || srsId === 'figma-design') ? null : srsId
    const analysis = requirementAnalyses.find(
      (r: any) => {
        if (srsId === 'figma-design') return r.generationMode === 'figma_only' && r.srsDocumentId === null
        return r.srsDocumentId === mappedId
      }
    )
    const suite = testSuites.find(
      (t: any) => t.srsDocumentId === mappedId
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
    if (selectedSrs._id === 'figma-design') {
      return requirementAnalyses.find((r: any) => r.generationMode === 'figma_only' && r.srsDocumentId === null) || null
    }
    const targetSrsId = selectedSrs._id === 'legacy' ? null : selectedSrs._id
    return requirementAnalyses.find((r: any) => r.srsDocumentId === targetSrsId) || null
  }, [selectedSrs, requirementAnalyses])

  const selectedSuite = useMemo(() => {
    if (!selectedSrs) return null
    const targetSrsId = (selectedSrs._id === 'legacy' || selectedSrs._id === 'figma-design') ? null : selectedSrs._id
    return testSuites.find((t: any) => t.srsDocumentId === targetSrsId) || null
  }, [selectedSrs, testSuites])

  /* ─── Handlers ─── */

  const handleLocalRunAgent0 = async (docId: string) => {
    setRunningActionDocId(docId)
    try {
      await runAgent0(docId)
    } finally {
      setRunningActionDocId(null)
    }
  }

  const handleLocalRunAgent1 = async (docId: string, mode?: string) => {
    setRunningActionDocId(docId)
    try {
      await runAgent1(docId, mode)
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

  const handleOpenGapFill = async (docId?: string) => {
    const targetDocId = docId || (selectedSrs ? selectedSrs._id : undefined)
    const analysis = requirementAnalyses.find(
      (r: any) => r.srsDocumentId === (targetDocId === 'legacy' ? null : targetDocId)
    )

    if (!analysis?.gapFillData) {
      if (targetDocId) setRunningActionDocId(targetDocId)
      try {
        await runGapFill(targetDocId)
      } finally {
        setRunningActionDocId(null)
      }
    }
    setIsGapFillOpen(true)
  }

  const handleReRunGapFill = async () => {
    const targetDocId = selectedSrs ? selectedSrs._id : undefined
    if (targetDocId) setRunningActionDocId(targetDocId)
    try {
      await runGapFill(targetDocId)
    } finally {
      setRunningActionDocId(null)
    }
  }

  const handleAddSelectedMissingCases = async (selectedCases: SuggestedTestCase[]) => {
    if (!project || selectedCases.length === 0) return

    const newCases: TestCase[] = selectedCases.map((stc) => ({
      id: stc.id || `TC-GAP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: stc.title,
      description: stc.description || '',
      module: stc.module || 'General',
      feature: stc.feature || 'Gap Fill',
      priority: stc.priority || 'Medium',
      type: stc.scenario_type === 'edge_case' ? 'Edge Case' : stc.scenario_type === 'negative' ? 'Negative' : 'Functional',
      scenario_type: stc.scenario_type || 'positive',
      tags: Array.isArray(stc.tags) ? stc.tags : ['gap-fill', 'ai-suggested'],
      preconditions: Array.isArray(stc.preconditions) ? stc.preconditions : [],
      test_data: {},
      steps: Array.isArray(stc.steps) ? stc.steps : [],
      expected_result: stc.expected_result || '',
      cleanup_steps: [],
      source_requirements: [],
    }))

    const targetSuite = selectedSuite || testSuites[0]
    if (!targetSuite) {
      toast.error('No active test suite found. Please generate test suite first.')
      return
    }

    const existingCases = targetSuite.testCases || []
    const mergedCases = [...existingCases]

    let addedCount = 0
    newCases.forEach((nc) => {
      if (!mergedCases.some((c) => c.id === nc.id || c.title.toLowerCase() === nc.title.toLowerCase())) {
        mergedCases.push(nc)
        addedCount++
      }
    })

    await agentService.saveTestSuite(project._id, targetSuite._id, mergedCases)
    toast.success(`Successfully added ${addedCount} missing test case(s) to the suite! 🚀`)
    await refreshProject()
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

      <MissingTestCasesModal
        open={isGapFillOpen}
        onOpenChange={setIsGapFillOpen}
        gapFillData={selectedAnalysis?.gapFillData || null}
        isLoading={agentRunning === 'gapfill'}
        onAddSelectedTestCases={handleAddSelectedMissingCases}
        onReRunGapFill={handleReRunGapFill}
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
          onRunAgent0={handleLocalRunAgent0}
          onRunAgent1={handleLocalRunAgent1}
          onRunAgent2={handleLocalRunAgent2}
          onOpenGapFill={() => handleOpenGapFill(selectedSrs._id)}
          onExportExcel={handleDownloadExcel}
          onOpenRunDialog={handleOpenRunDialog}
          hasFigma={!!(project.figmaSyncedFrames && project.figmaSyncedFrames.length > 0)}
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
          onRunAgent0={handleLocalRunAgent0}
          onRunAgent1={handleLocalRunAgent1}
          onRunAgent2={handleLocalRunAgent2}
          onRefreshProject={refreshProject}
          hasFigma={!!(project.figmaSyncedFrames && project.figmaSyncedFrames.length > 0)}
        />
      )}
    </div>
  )
}
