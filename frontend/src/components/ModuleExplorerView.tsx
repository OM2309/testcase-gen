'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Layers, PlayCircle, Loader2, AlertCircle, Sparkles, BrainCircuit,
  FlaskConical, Play, FileText,
  FileSpreadsheet, ChevronLeft, Link2
} from 'lucide-react'
import { TestCase, Agent0Feedback } from '../types'
import { SrsUploadSection } from './SrsUploadSection'
import { getPriorityBadge } from '../helpers/utils'
import { executionService } from '../services/executionService'
import { useProject } from '../contexts/ProjectContext'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface FeatureGroup {
  name: string
  description?: string
  testCases: TestCase[]
}

interface ModuleGroup {
  name: string
  description?: string
  features: FeatureGroup[]
  testCasesCount: number
}

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
    runGapFill,
    refreshProject
  } = useProject()

  // Dashboard tab: 'srs' | 'jira' | 'linear'
  const [dashboardTab, setDashboardTab] = useState<'srs' | 'jira' | 'linear'>('srs')

  const [activeModuleName, setActiveModuleName] = useState<string | null>(null)
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false)
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({})
  const [runningActionDocId, setRunningActionDocId] = useState<string | null>(null)

  // Execution config modal
  const [isRunOpen, setIsRunOpen] = useState(false)
  const [runTarget, setRunTarget] = useState<{
    type: 'project' | 'module' | 'feature' | 'testcase' | 'srs'
    name: string
    ids: string[]
    suiteId?: string
  } | null>(null)
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
      return [{
        _id: 'legacy',
        originalFileName: project.originalFileName,
        filePath: '',
        parsedText: project.parsedText || '',
        uploadedAt: project.createdAt
      }]
    }
    return []
  }, [project])

  const srsDocs = useMemo(() => srsDocumentsList.filter((d: any) => d.filePath !== 'virtual://jira' && d.filePath !== 'virtual://linear'), [srsDocumentsList])
  const jiraDocs = useMemo(() => srsDocumentsList.filter((d: any) => d.filePath === 'virtual://jira'), [srsDocumentsList])
  const linearDocs = useMemo(() => srsDocumentsList.filter((d: any) => d.filePath === 'virtual://linear'), [srsDocumentsList])

  const selectedSrs = useMemo(() => {
    return srsDocumentsList.find((d: any) => d._id === selectedSrsId)
  }, [selectedSrsId, srsDocumentsList])

  const getSrsTreeData = (srsId: string): ModuleGroup[] => {
    const analysis = requirementAnalyses.find((r: any) => r.srsDocumentId === (srsId === 'legacy' ? null : srsId))
    const suite = testSuites.find((t: any) => t.srsDocumentId === (srsId === 'legacy' ? null : srsId))
    if (!analysis || !analysis.analyzedData) return []

    const testCases = suite?.testCases || []
    return (analysis.analyzedData.modules || []).map((m: any) => {
      const features: FeatureGroup[] = (m.features || []).map((f: any) => {
        const matchingTcs = testCases.filter((tc: any) => tc.module === m.module_name && tc.feature === f.feature_name)
        return { name: f.feature_name, description: f.description, testCases: matchingTcs }
      })
      const totalTcs = features.reduce((acc: number, f: FeatureGroup) => acc + f.testCases.length, 0)
      return { name: m.module_name, description: m.description, features, testCasesCount: totalTcs }
    })
  }

  const selectedSrsModules = useMemo((): ModuleGroup[] => {
    if (!selectedSrs) return []
    return getSrsTreeData(selectedSrs._id)
  }, [selectedSrs, requirementAnalyses, testSuites])

  useEffect(() => {
    if (selectedSrsModules.length > 0) {
      if (!activeModuleName || !selectedSrsModules.some((m: ModuleGroup) => m.name === activeModuleName)) {
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
    try { await runAgent1(docId) } finally { setRunningActionDocId(null) }
  }

  const handleLocalRunAgent2 = async (docId: string) => {
    setRunningActionDocId(docId)
    try { await runAgent2(docId) } finally { setRunningActionDocId(null) }
  }

  const handleDownloadExcel = (fileName: string, modules: ModuleGroup[]) => {
    const data: any[] = []
    modules.forEach(m => {
      m.features.forEach((f: FeatureGroup) => {
        f.testCases.forEach((tc: any) => {
          data.push({
            'Module': m.name, 'Feature': f.name, 'Test Case ID': tc.id,
            'Title': tc.title, 'Description': tc.description, 'Scenario Type': tc.scenario_type,
            'Steps': tc.steps ? tc.steps.join('\n') : '',
            'Playwright Steps': tc.playwrightSteps ? tc.playwrightSteps.join('\n') : ''
          })
        })
      })
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'TestCases')
    XLSX.writeFile(wb, `${fileName.replace(/\.[^/.]+$/, "")}_testcases.xlsx`)
    toast.success('Excel file exported successfully!')
  }

  const handleOpenRunDialog = (type: 'project' | 'module' | 'feature' | 'testcase' | 'srs', name: string, testCases: TestCase[], suiteId?: string) => {
    const ids = testCases.map(tc => tc.id)
    if (ids.length === 0 || !suiteId) return
    setRunTarget({ type, name, ids, suiteId })
    setRunError(null)
    setIsRunOpen(true)
  }

  const handleStartRun = async () => {
    if (!runTarget || !project) return
    setRunError(null)
    if (!/^https?:\/\//i.test(runBaseUrl.trim())) { setRunError('Base URL must start with http:// or https://'); return }
    try {
      setStarting(true)
      const res = await executionService.startExecution({
        projectId: project._id, testSuiteId: runTarget.suiteId!, baseUrl: runBaseUrl.trim(),
        headless: runHeadless, testCaseIds: runTarget.ids
      })
      if (res.success) { setIsRunOpen(false); router.push(`/dashboard/${project._id}/execution?runId=${res.data.runId}`) }
    } catch (err: any) {
      setRunError(err?.response?.data?.error || err?.message || 'Failed to start execution')
    } finally { setStarting(false) }
  }

  /* ─── Feedback summary text (type-safe) ─── */
  const getFeedbackSummary = (): string => {
    if (!selectedAnalysis) return ''
    const fb = selectedAnalysis.agent0Feedback
    if (fb && typeof fb === 'object' && 'summary' in fb) return (fb as any).summary
    if (typeof fb === 'string') return fb
    return ''
  }

  /* ─── Table renderer ─── */
  const renderDocsTable = (docs: any[], isJira: boolean) => {
    if (docs.length === 0) {
      return (
        <div className="border border-dashed border-border rounded-xl py-10 text-center">
          <p className="text-xs text-muted-foreground italic">
            No {isJira ? 'Jira stories imported' : 'requirement documents uploaded'} yet.
          </p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto border border-border bg-card/10 rounded-2xl shadow-sm">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
              <th className="p-3.5">Name</th>
              <th className="p-3.5">Uploaded</th>
              <th className="p-3.5 text-center">Quality Score</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {docs.map((doc: any) => {
              const targetSrsId = doc._id === 'legacy' ? null : doc._id
              const analysis = requirementAnalyses.find((r: any) => r.srsDocumentId === targetSrsId) || null
              const suite = testSuites.find((t: any) => t.srsDocumentId === targetSrsId) || null
              const isAnalyzed = analysis && analysis.status === 'completed'
              const isAnalyzing = analysis && analysis.status === 'analyzing'
              const isSuiteGenerated = suite && suite.testCases?.length > 0
              const isThisRunning = agentRunning === 'agent1' && runningActionDocId === doc._id

              return (
                <tr key={doc._id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3.5 font-semibold text-foreground max-w-[220px] truncate">
                    <button
                      onClick={() => router.push(`?srsId=${doc._id}`)}
                      className="hover:underline text-left cursor-pointer text-xs font-semibold text-primary"
                    >
                      {doc.originalFileName || (isJira ? 'Jira Stories' : 'Requirement Specification')}
                    </button>
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="p-3.5 text-center">
                    {isAnalyzed && analysis && analysis.agent0Score != null ? (
                      <Badge variant="default" className="font-mono bg-primary/20 text-primary border border-primary/30">
                        {analysis.agent0Score}%
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Pending</span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    {isAnalyzing || isThisRunning ? (
                      <Badge variant="secondary" className="animate-pulse bg-amber-500/10 text-amber-600 dark:text-amber-400">Analyzing</Badge>
                    ) : isSuiteGenerated ? (
                      <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400">Suite Generated</Badge>
                    ) : isAnalyzed ? (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">Analyzed</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">New</Badge>
                    )}
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    {!isAnalyzed ? (
                      <button onClick={() => handleLocalRunAgent1(doc._id)} disabled={agentRunning !== null} className="btn-primary h-7 px-3 text-[10px] font-bold cursor-pointer">
                        {agentRunning === 'agent1' && runningActionDocId === doc._id ? <Loader2 className="w-3 h-3 animate-spin" /> : (isJira ? 'Analyze Stories' : 'Analyze PRD')}
                      </button>
                    ) : !isSuiteGenerated ? (
                      <button onClick={() => handleLocalRunAgent2(doc._id)} disabled={agentRunning !== null} className="btn-primary h-7 px-3 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer">
                        {agentRunning === 'agent2' && runningActionDocId === doc._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3" /> Generate Suite</>}
                      </button>
                    ) : (
                      <button onClick={() => router.push(`?srsId=${doc._id}`)} className="btn-secondary h-7 px-3 text-[10px] font-bold cursor-pointer">
                        View Modules
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  /* ─── Loading / Not Found ─── */

  if (loading && !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading project details…</p>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/20 text-xs text-muted-foreground">
        Project not found.
      </div>
    )
  }

  /* ─── Render ─── */

  return (
    <div className="space-y-6">

      {/* Run Config Dialog */}
      <Dialog open={isRunOpen} onOpenChange={setIsRunOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              Run Test Execution
            </DialogTitle>
            <DialogDescription>
              Configure browser environment to execute tests for {runTarget?.type} <strong>{runTarget?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-xs">
            {runError && (
              <div className="border border-border bg-muted/40 text-muted-foreground p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                {runError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Target Base URL</label>
              <input type="text" value={runBaseUrl} onChange={e => setRunBaseUrl(e.target.value)} placeholder="http://localhost:3000"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs" />
            </div>
            <div className="flex items-center justify-between border border-border/60 bg-muted/20 p-3 rounded-xl">
              <div>
                <span className="font-semibold block text-foreground">Run Headless</span>
                <span className="text-[10px] text-muted-foreground">Execute browser in the background.</span>
              </div>
              <button type="button" onClick={() => setRunHeadless(!runHeadless)}
                className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${runHeadless ? 'bg-primary' : 'bg-muted'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${runHeadless ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setIsRunOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleStartRun} disabled={starting} className="btn-primary">
              {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Play className="w-3.5 h-3.5" /> Start Execution</>}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedSrs ? (
        /* ━━━━━━━━━ DETAIL VIEW (selected doc/story) ━━━━━━━━━ */
        <div className="space-y-6 animate-fadeIn">

          {/* Back + Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push(window.location.pathname)} className="h-9 w-9 p-0 border border-gray-300 cursor-pointer rounded-lg" title="Back to Overview">
                <ChevronLeft size={20} className="flex mx-auto" />
              </button>
              <div>
                <span className="text-xs font-bold text-primary tracking-wider uppercase">Document View</span>
                <h1 className="text-xl font-bold text-foreground capitalize mt-0.5">
                  {selectedSrs.originalFileName || 'Requirement Specification'}
                </h1>
              </div>
            </div>
            {selectedSuite && selectedSuite.testCases?.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => handleDownloadExcel(selectedSrs.originalFileName, selectedSrsModules)} className="btn-secondary cursor-pointer">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Export Excel
                </button>
                <button onClick={() => {
                  const allDocTcs = selectedSrsModules.flatMap(m => m.features.flatMap(f => f.testCases))
                  handleOpenRunDialog('srs', selectedSrs.originalFileName, allDocTcs, selectedSuite._id)
                }} className="btn-primary cursor-pointer">
                  <PlayCircle className="w-4.5 h-4.5" /> Run Suite ({selectedSrsModules.reduce((acc: number, m: ModuleGroup) => acc + m.testCasesCount, 0)})
                </button>
              </div>
            ) : (
              <button disabled={agentRunning !== null} onClick={() => handleLocalRunAgent2(selectedSrs._id)}
                className="btn-primary h-9 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">
                {agentRunning === 'agent2' && runningActionDocId === selectedSrs._id
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating test cases...</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Generate Test Suite</>}
              </button>
            )}
          </div>

          {/* Parsed Text Preview */}
          {selectedSrs.parsedText && (
            <div className="border border-border bg-card/20 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Document Content / Story Details</h3>
              <div className="bg-background/80 border border-border/60 rounded-lg p-3.5 max-h-[200px] overflow-y-auto font-mono text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {selectedSrs.parsedText}
              </div>
            </div>
          )}

          {/* Accuracy Score Card */}
          {selectedAnalysis && selectedAnalysis.status === 'completed' && selectedAnalysis.agent0Score != null && (
            <div className="border border-border bg-card/20 rounded-2xl p-6 flex flex-col lg:flex-row items-stretch justify-between gap-6">
              <div className="lg:w-[70%] flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <h4 className="text-lg font-extrabold text-foreground">Accuracy Rating</h4>
                  <div className={`space-y-3 text-xs ${!isFeedbackExpanded ? 'max-h-[160px] overflow-hidden' : 'max-h-[350px] overflow-y-auto pr-2 custom-scrollbar'}`}>
                    <p className="text-muted-foreground leading-relaxed">{getFeedbackSummary()}</p>
                  </div>
                  <button onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)} className="text-primary font-bold text-xs hover:underline cursor-pointer">
                    {isFeedbackExpanded ? 'Show Less' : 'Show Full Feedback & Gaps'}
                  </button>
                </div>
              </div>
              <div className="lg:w-[26%] bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
                <BrainCircuit className="w-10 h-10 text-primary animate-pulse mb-3" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Requirement Score</span>
                <span className="text-5xl font-black text-primary my-2">{selectedAnalysis.agent0Score}%</span>
                <span className="text-[10px] text-muted-foreground mt-1">Extracted with GPT-4o</span>
              </div>
            </div>
          )}

          {/* Modules Explorer */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-sm font-bold text-foreground">Requirement Modules</h3>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                {selectedSrsModules.length} extracted modules
              </span>
            </div>

            {selectedSrsModules.length === 0 ? (
              <div className="border border-dashed rounded-2xl p-16 text-center text-xs text-muted-foreground leading-relaxed flex flex-col items-center justify-center gap-3">
                <Layers className="w-8 h-8 text-muted-foreground/60" />
                <div>
                  <p className="font-semibold text-foreground">No modules found</p>
                  <p className="mt-1">Please analyze your requirement document to generate structured modules.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left: Module Navigation */}
                <div className="lg:col-span-3 space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-1">Modules list</span>
                  <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                    {selectedSrsModules.map((mod: ModuleGroup) => {
                      const isActive = mod.name === activeModuleName
                      return (
                        <button key={mod.name} onClick={() => setActiveModuleName(mod.name)}
                          className={`flex-shrink-0 text-left px-4 py-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 cursor-pointer w-full ${
                            isActive ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' : 'bg-card/40 border-border hover:bg-card/60 text-muted-foreground hover:text-foreground'
                          }`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Layers className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="truncate capitalize">{mod.name}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isActive ? 'bg-primary/20 text-primary font-bold' : 'bg-muted text-muted-foreground'}`}>
                            {mod.testCasesCount}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Right: Features & Test Cases */}
                <div className="lg:col-span-9 space-y-4">
                  {renderActiveModule()}
                </div>
              </div>
            )}
          </div>
        </div>

      ) : (

        /* ━━━━━━━━━ OVERVIEW DASHBOARD WITH TWO TABS ━━━━━━━━━ */
        <div className="space-y-6 animate-fadeIn">

          {/* Project Header */}
          <div className="space-y-2 pb-2 border-b border-border/40">
            <span className="text-xs font-bold text-primary tracking-wider uppercase">Active Project</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground capitalize">{project.projectName}</h1>
            {project.projectDescription && (
              <p className="text-sm text-muted-foreground max-w-xl capitalize">{project.projectDescription}</p>
            )}
          </div>

          {agentError && (
            <div className="border border-border bg-muted/40 text-muted-foreground p-4 rounded-xl flex items-center gap-3 text-sm animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              {agentError}
            </div>
          )}

          {/* ── Two Main Tabs ── */}
          <div className="border-b border-border">
            <div className="flex gap-0">
              <button
                onClick={() => setDashboardTab('srs')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  dashboardTab === 'srs'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <FileText className="w-4 h-4" />
                SRS Documents
                {srsDocs.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${dashboardTab === 'srs' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {srsDocs.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setDashboardTab('jira')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  dashboardTab === 'jira'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Jira Tickets
                {jiraDocs.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${dashboardTab === 'jira' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {jiraDocs.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setDashboardTab('linear')}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  dashboardTab === 'linear'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Link2 className="w-4 h-4" />
                Linear Stories
                {linearDocs.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${dashboardTab === 'linear' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {linearDocs.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ── Tab Content ── */}
          {dashboardTab === 'srs' ? (
            <div className="space-y-5 animate-fadeIn">
              <SrsUploadSection
                projectId={project._id}
                srsDocuments={project.srsDocuments ?? []}
                project={project}
                mode="upload"
                onSrsUploaded={() => refreshProject()}
              />
              {renderDocsTable(srsDocs, false)}
            </div>
          ) : dashboardTab === 'jira' ? (
            <div className="space-y-5 animate-fadeIn">
              <SrsUploadSection
                projectId={project._id}
                srsDocuments={project.srsDocuments ?? []}
                project={project}
                mode="jira"
                onSrsUploaded={() => refreshProject()}
              />
              {renderDocsTable(jiraDocs, true)}
            </div>
          ) : (
            <div className="space-y-5 animate-fadeIn">
              <SrsUploadSection
                projectId={project._id}
                srsDocuments={project.srsDocuments ?? []}
                project={project}
                mode="linear"
                onSrsUploaded={() => refreshProject()}
              />
              {renderDocsTable(linearDocs, true)}
            </div>
          )}

        </div>
      )}
    </div>
  )

  /* ─── Active module sub-renderer ─── */
  function renderActiveModule() {
    const activeMod = selectedSrsModules.find((m: ModuleGroup) => m.name === activeModuleName)
    if (!activeMod) return <p className="text-xs text-muted-foreground italic">Select a module to view.</p>

    return (
      <div className="space-y-4">
        {/* Module Header */}
        <div className="border border-border bg-card/45 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Active Module</span>
            <h4 className="text-sm font-bold text-foreground capitalize">{activeMod.name}</h4>
            {activeMod.description && <p className="text-[11px] text-muted-foreground">{activeMod.description}</p>}
          </div>
          {selectedSuite && activeMod.testCasesCount > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={() => handleDownloadExcel(`${selectedSrs!.originalFileName}_${activeMod.name}`, [activeMod])} className="btn-secondary h-8 px-3 text-xs">
                Export Module Excel
              </button>
              <button onClick={() => {
                const modTcs = activeMod.features.flatMap((f: FeatureGroup) => f.testCases)
                handleOpenRunDialog('module', activeMod.name, modTcs, selectedSuite!._id)
              }} className="btn-primary h-8 px-3 text-xs">
                Run Module Tests ({activeMod.testCasesCount})
              </button>
            </div>
          )}
        </div>

        {/* Features */}
        {activeMod.features.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-8">No features identified under this module.</p>
        ) : (
          <div className="space-y-3">
            {activeMod.features.map((feat: FeatureGroup) => {
              const feKey = `${activeMod.name}::${feat.name}`
              const isFeatExpanded = expandedFeatures[feKey]
              const positiveCount = feat.testCases.filter((tc: any) => tc.scenario_type === 'positive').length
              const negativeCount = feat.testCases.filter((tc: any) => tc.scenario_type === 'negative').length

              return (
                <div key={feat.name} className="border border-border bg-card/10 rounded-2xl p-4 space-y-3">
                  <div onClick={() => setExpandedFeatures(prev => ({ ...prev, [feKey]: !isFeatExpanded }))} className="flex items-start justify-between gap-4 cursor-pointer">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-sm text-foreground capitalize">{feat.name}</h5>
                        <Badge variant="secondary" className="font-mono text-[9px] font-bold">{feat.testCases.length} Test Cases</Badge>
                      </div>
                      {feat.description && <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 font-bold text-primary uppercase">
                        {positiveCount} Positive
                      </span>
                      {negativeCount > 0 && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-muted border border-border font-medium text-muted-foreground uppercase">
                          {negativeCount} Negative
                        </span>
                      )}
                    </div>
                  </div>

                  {isFeatExpanded && (
                    <div className="space-y-1.5 border-t border-border/40 pt-3">
                      {feat.testCases.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground py-2 italic">No test cases generated.</p>
                      ) : (
                        <div className="divide-y divide-border/20 text-xs">
                          {feat.testCases.map((tc: any) => (
                            <div key={tc.id}
                              onClick={() => {
                                const srsParam = selectedSrsId ? `&srsId=${selectedSrsId}` : ''
                                router.push(`/dashboard/${project!._id}/test-cases?caseId=${tc.id}${srsParam}`)
                              }}
                              className="flex items-center justify-between py-2.5 hover:bg-muted/40 px-2.5 rounded-lg cursor-pointer transition-colors gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className="text-[10px] font-mono font-bold text-primary flex-shrink-0 min-w-[110px] whitespace-nowrap">{tc.id}</span>
                                <span className="font-semibold text-foreground truncate capitalize">{tc.title}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {getPriorityBadge(tc.priority)}
                                <span className={`text-[8px] px-1.5 py-0.5 rounded border font-semibold uppercase ${tc.scenario_type === 'positive' ? 'bg-primary/5 text-primary border-primary/20' : 'bg-muted/40 text-muted-foreground border-border'}`}>
                                  {tc.scenario_type}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
}
