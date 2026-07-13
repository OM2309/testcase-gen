'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FolderOpen, FolderClosed, Layers, Cpu, PlayCircle, Eye, Loader2,
  AlertCircle, Sparkles, BrainCircuit, FlaskConical, Search, ChevronDown,
  ChevronRight, Play, Info, FileText, ArrowRight, Settings, Plus, CheckCircle2,
  FileSpreadsheet, RotateCcw, ArrowLeft
} from 'lucide-react'
import { TestCase } from '../types'
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
    refreshProject
  } = useProject()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeModuleName, setActiveModuleName] = useState<string | null>(null)
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false)
  const [expandedSrs, setExpandedSrs] = useState<Record<string, boolean>>({})
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({})
  const [expandedSrsScores, setExpandedSrsScores] = useState<Record<string, boolean>>({})

  // Run execution dialog state
  const [isRunOpen, setIsRunOpen] = useState(false)
  const [runBaseUrl, setRunBaseUrl] = useState('http://localhost:3000')
  const [runHeadless, setRunHeadless] = useState(true)
  const [starting, setStarting] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [runTarget, setRunTarget] = useState<{
    type: 'project' | 'module' | 'feature' | 'testcase' | 'srs'
    name: string
    ids: string[]
    suiteId?: string
  } | null>(null)

  // Derive SRS Documents list (handling legacy single-file projects)
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

  // Auto-expand the first SRS node by default
  useEffect(() => {
    if (srsDocumentsList.length > 0) {
      setExpandedSrs(prev => {
        if (Object.keys(prev).length === 0) {
          return { [srsDocumentsList[0]._id]: true }
        }
        return prev
      })
    }
  }, [srsDocumentsList])

  // Toggle helpers
  const toggleSrs = (srsId: string) => {
    setExpandedSrs(prev => ({ ...prev, [srsId]: !prev[srsId] }))
  }

  const toggleModule = (srsId: string, modName: string) => {
    const key = `${srsId}::${modName}`
    setExpandedModules(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleFeature = (srsId: string, modName: string, featName: string) => {
    const key = `${srsId}::${modName}::${featName}`
    setExpandedFeatures(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleDownloadExcel = useCallback((srsName: string, modules: ModuleGroup[]) => {
    try {
      const wb = XLSX.utils.book_new()
      let hasData = false

      modules.forEach(mod => {
        const testCases = mod.features.flatMap(f => f.testCases)
        if (testCases.length === 0) return

        hasData = true

        const sheetData = testCases.map(tc => ({
          'Test Case ID': tc.id,
          'Title': tc.title,
          'Description': tc.description || '',
          'Feature': tc.feature || '',
          'Priority': tc.priority,
          'Scenario Type': tc.scenario_type || '',
          'Expected Result': tc.expected_result || '',
          'Steps': tc.steps.map(s => `${s.step_number}. ${s.action} ${s.target || ''} ${s.value ? `(${s.value})` : ''}`).join('\n')
        }))

        const ws = XLSX.utils.json_to_sheet(sheetData)

        const cleanSheetName = mod.name
          .replace(/[:\\/?*\[\]]/g, '')
          .substring(0, 30) || 'General'

        XLSX.utils.book_append_sheet(wb, ws, cleanSheetName)
      })

      if (!hasData) {
        toast.error('No test cases generated to export yet!')
        return
      }

      const safeFileName = `${srsName.replace(/\.[^/.]+$/, "")}_TestCases.xlsx`
      XLSX.writeFile(wb, safeFileName)
      toast.success('Excel file downloaded successfully! 📊')
    } catch (err: any) {
      console.error('Failed to export Excel:', err)
      toast.error('Failed to export Excel file.')
    }
  }, [])

  // Get module tree structure for a specific SRS document ID
  const getSrsTreeData = useCallback((srsId: string) => {
    const targetSrsId = srsId === 'legacy' ? null : srsId
    const analysis = requirementAnalyses.find(r => r.srsDocumentId === targetSrsId) || null
    const suite = testSuites.find(t => t.srsDocumentId === targetSrsId) || null

    const modulesMap = new Map<string, { description?: string, features: Map<string, { description?: string, testCases: TestCase[] }> }>()

    const reqData = analysis?.analyzedData
    if (reqData?.modules) {
      reqData.modules.forEach((mod: any) => {
        const modName = mod.module_name || 'General'
        if (!modulesMap.has(modName)) {
          modulesMap.set(modName, { description: mod.description, features: new Map() })
        }
        const modGroup = modulesMap.get(modName)!

        if (mod.features) {
          mod.features.forEach((feat: any) => {
            const featName = feat.feature_name || 'General'
            if (!modGroup.features.has(featName)) {
              modGroup.features.set(featName, { description: feat.description, testCases: [] })
            }
          })
        }
      })
    }

    if (suite?.testCases) {
      suite.testCases.forEach((tc: TestCase) => {
        const modName = tc.module || 'General'
        const featName = tc.feature || 'General'

        if (!modulesMap.has(modName)) {
          modulesMap.set(modName, { features: new Map() })
        }
        const modGroup = modulesMap.get(modName)!

        if (!modGroup.features.has(featName)) {
          modGroup.features.set(featName, { testCases: [] })
        }
        const featGroup = modGroup.features.get(featName)!

        if (!featGroup.testCases.some(t => t.id === tc.id)) {
          featGroup.testCases.push(tc)
        }
      })
    }

    const result: ModuleGroup[] = []
    modulesMap.forEach((modVal, modName) => {
      const features: FeatureGroup[] = []
      let totalTests = 0

      modVal.features.forEach((featVal, featName) => {
        totalTests += featVal.testCases.length
        features.push({
          name: featName,
          description: featVal.description,
          testCases: featVal.testCases
        })
      })

      features.sort((a, b) => a.name.localeCompare(b.name))

      result.push({
        name: modName,
        description: modVal.description,
        features,
        testCasesCount: totalTests
      })
    })

    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [requirementAnalyses, testSuites])

  // Get total stats across all loaded SRS documents
  const overallStats = useMemo(() => {
    let totalModules = 0
    let totalFeatures = 0
    let totalTests = 0
    let totalRegressive = 0

    srsDocumentsList.forEach(doc => {
      const tree = getSrsTreeData(doc._id)
      totalModules += tree.length
      tree.forEach(m => {
        totalFeatures += m.features.length
        totalTests += m.testCasesCount
        m.features.forEach(f => {
          totalRegressive += f.testCases.filter(tc => tc.isRegressive).length
        })
      })
    })

    return { totalModules, totalFeatures, totalTests, totalRegressive }
  }, [srsDocumentsList, getSrsTreeData])

  const selectedSrs = useMemo(() => {
    return srsDocumentsList.find(d => d._id === selectedSrsId)
  }, [selectedSrsId, srsDocumentsList])

  const selectedSrsModules = useMemo(() => {
    if (!selectedSrs) return []
    return getSrsTreeData(selectedSrs._id)
  }, [selectedSrs, getSrsTreeData])

  // Auto-select first module for the active SRS document
  useEffect(() => {
    if (selectedSrsModules && selectedSrsModules.length > 0) {
      if (!activeModuleName || !selectedSrsModules.some(m => m.name === activeModuleName)) {
        setActiveModuleName(selectedSrsModules[0].name)
      }
    } else {
      setActiveModuleName(null)
    }
  }, [selectedSrsModules, activeModuleName])

  const selectedAnalysis = useMemo(() => {
    if (!selectedSrs) return null
    const targetSrsId = selectedSrs._id === 'legacy' ? null : selectedSrs._id
    return requirementAnalyses.find(r => r.srsDocumentId === targetSrsId) || null
  }, [selectedSrs, requirementAnalyses])

  const selectedSuite = useMemo(() => {
    if (!selectedSrs) return null
    const targetSrsId = selectedSrs._id === 'legacy' ? null : selectedSrs._id
    return testSuites.find(t => t.srsDocumentId === targetSrsId) || null
  }, [selectedSrs, testSuites])

  const handleOpenRunDialog = (
    type: 'project' | 'module' | 'feature' | 'testcase' | 'srs',
    name: string,
    testCases: TestCase[],
    suiteId?: string
  ) => {
    const ids = testCases.map(tc => tc.id)
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
        testCaseIds: runTarget.ids
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

  const handleEditTestCase = (id: string) => {
    if (!project) return
    router.push(`/dashboard/${project._id}/test-cases?caseId=${id}`)
  }

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

  return (
    <div className="space-y-6">
      {/* Run config Modal */}
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
              <input
                type="text"
                value={runBaseUrl}
                onChange={e => setRunBaseUrl(e.target.value)}
                placeholder="http://localhost:3000"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
              />
              <span className="text-[10px] text-muted-foreground">The web app url where automated Playwright tests will be directed.</span>
            </div>

            <div className="flex items-center justify-between border border-border/60 bg-muted/20 p-3 rounded-xl">
              <div>
                <span className="font-semibold block text-foreground">Run Headless</span>
                <span className="text-[10px] text-muted-foreground">Execute browser in the background without UI window.</span>
              </div>
              <button
                type="button"
                onClick={() => setRunHeadless(!runHeadless)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${runHeadless ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${runHeadless ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex gap-2">
              <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                This triggers a headless Playwright browser to execute <strong>{runTarget?.ids.length}</strong> selected test case(s). Logs and screenshots are recorded in real time.
              </p>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsRunOpen(false)}
              className="px-4 py-2 border rounded-xl hover:bg-muted text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleStartRun}
              disabled={starting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-40"
            >
              {starting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Start Execution
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedSrs ? (
        /* SRS Detail View Sub-page */
        <div className="space-y-6 animate-fadeIn">
          {/* Back button and Page Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(window.location.pathname)}
                className="inline-flex items-center justify-center p-2 rounded-xl border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title="Back to Overview"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary tracking-wider uppercase">Document View</span>
                  {selectedSuite && selectedSuite.testCases?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
                      Fully Covered
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-foreground capitalize mt-0.5">
                  {selectedSrs.originalFileName || 'Requirement Specification'}
                </h1>
              </div>
            </div>

            {/* Sub-view Actions: Export Excel and Run Suite */}
            {selectedSuite && selectedSuite.testCases?.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleDownloadExcel(selectedSrs.originalFileName, selectedSrsModules)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-border bg-card/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Export Excel
                </button>
                <button
                  onClick={() => {
                    const allDocTcs = selectedSrsModules.flatMap(m => m.features.flatMap(f => f.testCases))
                    handleOpenRunDialog('srs', selectedSrs.originalFileName, allDocTcs, selectedSuite._id)
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <PlayCircle className="w-4.5 h-4.5" /> Run Suite ({selectedSrsModules.reduce((acc, m) => acc + m.testCasesCount, 0)})
                </button>
              </div>
            )}
          </div>

          {/* Accuracy Score Card (Full Width on Top) */}
          <div>
            {selectedAnalysis && selectedAnalysis.status === 'completed' && selectedAnalysis.agent0Score !== undefined && selectedAnalysis.agent0Score !== null ? (
              <div className="border border-border bg-card/20 rounded-2xl p-6 flex flex-col lg:flex-row items-stretch justify-between gap-6">
                {/* Left Column: 70% space for text */}
                <div className="lg:w-[70%] flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h4 className="text-lg font-extrabold text-foreground tracking-wide block">Accuracy Rating</h4>
                    <div className={`text-xs text-muted-foreground leading-relaxed whitespace-pre-line ${
                      !isFeedbackExpanded ? 'line-clamp-4 overflow-hidden' : 'max-h-[250px] overflow-y-auto pr-2 custom-scrollbar'
                    }`}>
                      {selectedAnalysis.agent0Feedback}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                    >
                      {isFeedbackExpanded ? 'Read Less ▲' : 'Read More ▼'}
                    </button>

                    {selectedAnalysis.agent0Score < 70 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-bold">
                        Score below 70%: Review details below.
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Column: 30% space for the big graph */}
                <div className="lg:w-[30%] border-t lg:border-t-0 lg:border-l border-border/40 pt-6 lg:pt-0 lg:pl-6 flex flex-col items-center justify-center text-center gap-3 flex-shrink-0">
                  <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-background border border-border">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle cx="48" cy="48" r="42" className="stroke-muted" strokeWidth="5" fill="transparent" />
                      <circle cx="48" cy="48" r="42" className="stroke-primary" strokeWidth="5" fill="transparent" strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - (selectedAnalysis.agent0Score || 0) / 100)}`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-2xl font-black text-primary">{selectedAnalysis.agent0Score}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-wider block">Coverage Rating</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 block">Functional detail score</span>
                  </div>
                </div>
              </div>
            ) : selectedAnalysis && selectedAnalysis.status === 'analyzing' ? (
              <div className="border border-border bg-card/20 rounded-2xl p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span>Analyzing requirements...</span>
              </div>
            ) : (
              <div className="border border-border bg-card/20 rounded-2xl p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
                <AlertCircle className="w-6 h-6 text-muted-foreground" />
                <span>No requirement analysis found.</span>
              </div>
            )}
          </div>

          {/* Requirement Modules Section (Master-Detail Layout) */}
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
                {/* Left Side: Module Tabs/Navigation List */}
                <div className="lg:col-span-3 space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-1">Modules list</span>
                  <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                    {selectedSrsModules.map((mod) => {
                      const isActive = mod.name === activeModuleName
                      return (
                        <button
                          key={mod.name}
                          onClick={() => setActiveModuleName(mod.name)}
                          className={`flex-shrink-0 text-left px-4 py-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 cursor-pointer w-full ${
                            isActive
                              ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                              : 'bg-card/40 border-border hover:bg-card/60 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Layers className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="truncate capitalize">{mod.name}</span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${isActive ? 'bg-primary/20 text-primary font-bold' : 'bg-muted text-muted-foreground'}`}>
                            {mod.testCasesCount}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Right Side: Active Module's Features & Test Cases */}
                <div className="lg:col-span-9">
                  {(() => {
                    const activeMod = selectedSrsModules.find(m => m.name === activeModuleName)
                    if (!activeMod) {
                      return (
                        <div className="border border-border bg-card/20 rounded-2xl p-8 text-center text-xs text-muted-foreground">
                          Select a module to view features and test cases.
                        </div>
                      )
                    }

                    return (
                      <div className="border border-border bg-card/10 rounded-2xl p-6 space-y-6">
                        {/* Selected Module Title and Actions */}
                        <div className="flex items-center justify-between gap-4 border-b border-border/30 pb-4 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Active Module</span>
                              <span className="px-2 py-0.5 rounded-full border bg-muted text-[10px] font-bold text-muted-foreground capitalize">
                                {activeMod.features.length} Features
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-foreground capitalize mt-1">{activeMod.name}</h4>
                            {activeMod.description && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{activeMod.description}</p>
                            )}
                          </div>

                          {selectedSuite && selectedSuite.testCases?.length > 0 && activeMod.testCasesCount > 0 && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDownloadExcel(`${selectedSrs.originalFileName}_${activeMod.name}`, [activeMod])}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Export module to Excel"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Export Excel
                              </button>
                              <button
                                onClick={() => {
                                  const allModTcs = activeMod.features.flatMap(f => f.testCases)
                                  handleOpenRunDialog('module', activeMod.name, allModTcs, selectedSuite._id)
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                                title="Run module tests"
                              >
                                <PlayCircle className="w-3.5 h-3.5" /> Run Module Tests
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Features List for active module */}
                        <div className="space-y-4">
                          {activeMod.features.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">No features found in this module.</p>
                          ) : (
                            activeMod.features.map(feat => {
                              const positiveCount = feat.testCases.filter(tc => tc.scenario_type === 'positive').length
                              const negativeCount = feat.testCases.filter(tc => tc.scenario_type === 'negative').length

                              return (
                                <div key={feat.name} className="border border-border/40 rounded-xl bg-card/40 hover:bg-card/50 transition-all duration-150 p-4 space-y-4">
                                  {/* Feature Header */}
                                  <div className="flex items-center justify-between gap-3 border-b border-border/30 pb-2.5 flex-wrap">
                                    <div className="flex items-center gap-2.5">
                                      <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                                        <Cpu className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <h5 className="text-xs font-bold text-foreground capitalize">{feat.name}</h5>
                                        {feat.description && (
                                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{feat.description}</p>
                                        )}
                                      </div>
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

                                  {/* Test Cases inside the Feature */}
                                  <div className="space-y-1.5">
                                    {feat.testCases.length === 0 ? (
                                      <p className="text-[10px] text-muted-foreground py-2 italic">No test cases generated.</p>
                                    ) : (
                                      <div className="divide-y divide-border/20 text-xs">
                                        {feat.testCases.map(tc => (
                                          <div
                                            key={tc.id}
                                            onClick={() => handleEditTestCase(tc.id)}
                                            className="flex items-center justify-between py-2.5 hover:bg-muted/40 px-2.5 rounded-lg cursor-pointer transition-colors gap-3"
                                          >
                                            <div className="flex items-center gap-3 min-w-0">
                                              <span className="text-[10px] font-mono font-bold text-primary flex-shrink-0 w-12">{tc.id}</span>
                                              <span className="font-semibold text-foreground truncate capitalize">{tc.title}</span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              {getPriorityBadge(tc.priority)}
                                              <span className={`text-[8px] px-1.5 py-0.2 rounded border font-semibold uppercase ${tc.scenario_type === 'positive' ? 'bg-primary/5 text-primary border-primary/20' : 'bg-muted/40 text-muted-foreground border-border'}`}>
                                                {tc.scenario_type}
                                              </span>
                                              {selectedSuite && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleOpenRunDialog('testcase', tc.id, [tc], selectedSuite._id)
                                                  }}
                                                  title="Run test case"
                                                  className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                                >
                                                  <PlayCircle className="w-3.5 h-3.5 text-primary" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Overview Dashboard */
        <div className="space-y-6">
          {/* Project Header */}
          <div className="space-y-2 relative overflow-hidden pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary tracking-wider uppercase">Project Workspace</span>
              <span className="px-2 py-0.5 rounded-full border bg-muted text-[10px] font-semibold">
                {srsDocumentsList.length} Requirement document{srsDocumentsList.length > 1 ? 's' : ''}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground capitalize">{project.projectName}</h1>
            {project.projectDescription && (
              <p className="text-sm text-muted-foreground max-w-xl capitalize">{project.projectDescription}</p>
            )}
          </div>

          {/* 4 Small Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {/* Card 1: Requirement Docs */}
            <div className="border border-border bg-card/40 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Requirement Docs</span>
              <span className="text-2xl font-extrabold text-foreground mt-2 block">{srsDocumentsList.length}</span>
            </div>
            
            {/* Card 2: Total Modules */}
            <div className="border border-border bg-card/40 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Modules</span>
              <span className="text-2xl font-extrabold text-foreground mt-2 block">{overallStats.totalModules}</span>
            </div>

            {/* Card 3: Total Features */}
            <div className="border border-border bg-card/40 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Features</span>
              <span className="text-2xl font-extrabold text-foreground mt-2 block">{overallStats.totalFeatures}</span>
            </div>

            {/* Card 4: Generated Tests */}
            <div className="border border-border bg-card/40 rounded-xl p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Generated Tests</span>
                {overallStats.totalRegressive > 0 && (
                  <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-1 py-0.2 rounded font-semibold uppercase tracking-wider">
                    {overallStats.totalRegressive} Regressive
                  </span>
                )}
              </div>
              <span className="text-2xl font-extrabold text-foreground mt-2 block">{overallStats.totalTests}</span>
            </div>
          </div>

          {/* SRS Upload Area */}
          <div className="mt-2 space-y-3">
            <h2 className="text-sm font-bold text-foreground">Upload Requirement Document</h2>
            <SrsUploadSection
              projectId={project._id}
              srsDocuments={project.srsDocuments ?? []}
              onSrsUploaded={() => {
                refreshProject()
              }}
            />
          </div>

          {agentError && (
            <div className="border border-border bg-muted/40 text-muted-foreground p-4 rounded-xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              {agentError}
            </div>
          )}

          {/* Unified Multi-SRS Tree Explorer in Cards Format */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <h2 className="text-sm font-bold text-foreground">Uploaded Requirement Documents</h2>

            {srsDocumentsList.length === 0 ? (
              <div className="border border-dashed border-border rounded-2xl bg-card/10 flex flex-col items-center justify-center p-16 text-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <BrainCircuit className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="font-semibold text-lg">Upload a Requirement Document</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload your first requirement document above to generate structured modules and test suites.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {srsDocumentsList.map((doc, srsIdx) => {
                  const targetSrsId = doc._id === 'legacy' ? null : doc._id
                  const analysis = requirementAnalyses.find(r => r.srsDocumentId === targetSrsId) || null
                  const suite = testSuites.find(t => t.srsDocumentId === targetSrsId) || null

                  const isAnalyzed = analysis && analysis.status === 'completed'
                  const isAnalyzing = analysis && analysis.status === 'analyzing'
                  const isSuiteGenerated = suite && suite.testCases?.length > 0

                  return (
                    <div
                      key={doc._id}
                      onClick={() => router.push(`?srsId=${doc._id}`)}
                      className="border rounded-2xl bg-card/30 border-border/80 hover:border-primary/40 hover:bg-card/50 transition-all duration-200 p-5 flex flex-col justify-between gap-4 cursor-pointer relative overflow-hidden group shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <FileText className="w-4.5 h-4.5 text-primary" />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Requirement Doc {srsIdx + 1}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors capitalize">
                            {doc.originalFileName || 'Specification Document'}
                          </h3>
                          {doc.uploadedAt && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Accuracy score circular indicator directly on the card if analyzed */}
                      <div className="border-t border-border/40 pt-4 flex items-center justify-between gap-3" onClick={e => e.stopPropagation()}>
                        {isAnalyzed && analysis && analysis.agent0Score !== null && analysis.agent0Score !== undefined ? (
                          <div className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-background border border-border">
                              <svg className="w-8 h-8 transform -rotate-90">
                                <circle cx="16" cy="16" r="12" className="stroke-muted" strokeWidth="2.5" fill="transparent" />
                                <circle cx="16" cy="16" r="12" className="stroke-primary" strokeWidth="2.5" fill="transparent" strokeDasharray={`${2 * Math.PI * 12}`} strokeDashoffset={`${2 * Math.PI * 12 * (1 - (analysis.agent0Score || 0) / 100)}`} strokeLinecap="round" />
                              </svg>
                              <span className="absolute text-[8px] font-black text-primary">{analysis.agent0Score}%</span>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-foreground leading-none">Accuracy Score</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">Parsed details rank</p>
                            </div>
                          </div>
                        ) : isAnalyzing ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span>Analyzing document...</span>
                          </div>
                        ) : (
                          <div className="text-[10px] font-semibold text-muted-foreground">
                            Not analyzed yet
                          </div>
                        )}

                        {/* Suite Actions */}
                        <div>
                          {!isAnalyzed ? (
                            <button
                              onClick={() => runAgent1(doc._id)}
                              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition-opacity cursor-pointer"
                            >
                              Analyze
                            </button>
                          ) : !isSuiteGenerated ? (
                            <button
                              onClick={() => runAgent2(doc._id)}
                              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" /> Generate Suite
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary">
                              <CheckCircle2 className="w-3 h-3 text-primary" /> Fully Covered
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
