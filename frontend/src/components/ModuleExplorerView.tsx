'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FolderOpen, FolderClosed, Layers, Cpu, PlayCircle, Eye, Loader2,
  AlertCircle, Sparkles, BrainCircuit, FlaskConical, Search, ChevronDown,
  ChevronRight, Play, Info, FileText, ArrowRight, Settings, Plus, CheckCircle2,
  FileSpreadsheet, RotateCcw, ArrowLeft,
  ChevronLeft, Lightbulb, ShieldAlert, Zap, Target
} from 'lucide-react'
import { TestCase, Agent0Feedback, GapFillItem } from '../types'
import { SrsUploadSection } from './SrsUploadSection'
import { getPriorityBadge } from '../helpers/utils'
import { executionService } from '../services/executionService'
import { useProject } from '../contexts/ProjectContext'
import { agentService } from '../services/agentService'
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
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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

  const [searchQuery, setSearchQuery] = useState('')
  const [activeModuleName, setActiveModuleName] = useState<string | null>(null)
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false)
  const [expandedSrs, setExpandedSrs] = useState<Record<string, boolean>>({})
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({})
  const [expandedSrsScores, setExpandedSrsScores] = useState<Record<string, boolean>>({})
  const [expandedGaps, setExpandedGaps] = useState<Record<string, boolean>>({})
  const [selectedGapTestCases, setSelectedGapTestCases] = useState<Record<string, boolean>>({})
  const [addingGapCases, setAddingGapCases] = useState(false)
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false)
  const [targetModuleOption, setTargetModuleOption] = useState('')
  const [customModuleName, setCustomModuleName] = useState('')
  const [runningActionDocId, setRunningActionDocId] = useState<string | null>(null)

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

  const handleAddSelectedClick = () => {
    const selectedIds = Object.entries(selectedGapTestCases).filter(([, v]) => v).map(([k]) => k)
    if (selectedIds.length === 0) {
      toast.error('Please select at least one test case to add.')
      return
    }
    if (selectedSrsModules && selectedSrsModules.length > 0) {
      setTargetModuleOption(selectedSrsModules[0].name)
    } else {
      setTargetModuleOption('')
    }
    setCustomModuleName('')
    setIsAddModuleOpen(true)
  }

  const handleConfirmAddSelected = async () => {
    if (!selectedSuite || !project) return
    const chosenModule = customModuleName.trim() || targetModuleOption
    if (!chosenModule) {
      toast.error('Please select or enter a module name.')
      return
    }

    const selectedIds = Object.entries(selectedGapTestCases).filter(([, v]) => v).map(([k]) => k)

    const newTestCases = filledGaps
      .flatMap(g => g.suggested_test_cases)
      .filter(tc => selectedIds.includes(tc.id))
      .map(tc => ({
        ...tc,
        id: tc.id || `TC-GAP-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        module: chosenModule,
        type: 'functional',
        isRegressive: false,
        severity: 'Major',
        test_data: {},
        cleanup_steps: [],
        source_requirements: [],
        tags: tc.tags || ['gap-fill', 'ai-suggested'],
        preconditions: tc.preconditions || [],
        steps: (tc.steps || []).map((s: any, idx: number) => ({
          step_number: s.step_number || idx + 1,
          action: s.action || '',
          target: s.target || s.selector || '',
          value: s.value || '',
          description: s.description || '',
          expected: s.expected || '',
          expected_url: s.expected_url || '',
          expected_text: s.expected_text || ''
        }))
      }))

    setAddingGapCases(true)
    try {
      const mergedCases = [...selectedSuite.testCases, ...newTestCases]
      await agentService.saveTestSuite(project._id, selectedSuite._id, mergedCases)
      await refreshProject()
      setSelectedGapTestCases({})
      setIsAddModuleOpen(false)
      toast.success(`${newTestCases.length} test case(s) added to module "${chosenModule}"! ✅`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add test cases.')
    } finally {
      setAddingGapCases(false)
    }
  }

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

  const filledGaps = useMemo<any[]>(() => {
    if (!selectedAnalysis) return []
    return selectedAnalysis.gapFillData?.filled_gaps || []
  }, [selectedAnalysis])

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
    const srsParam = selectedSrsId ? `&srsId=${selectedSrsId}` : ''
    router.push(`/dashboard/${project._id}/test-cases?caseId=${id}${srsParam}`)
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
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleStartRun}
              disabled={starting}
              className="btn-primary"
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

      {/* Target Module Choice Modal */}
      <Dialog open={isAddModuleOpen} onOpenChange={setIsAddModuleOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-base">
              <Layers className="w-5 h-5 text-primary" />
              Add to Module
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select an existing module or enter a new one to insert the selected gap-fill test case(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Select Existing Module</label>
              <select
                value={targetModuleOption}
                onChange={e => {
                  setTargetModuleOption(e.target.value)
                  setCustomModuleName('')
                }}
                className="w-full h-9 px-2.5 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs cursor-pointer"
              >
                {selectedSrsModules.map(m => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
                <option value="">-- Create a new module --</option>
              </select>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground text-[10px]">Or</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Create New Module</label>
              <input
                type="text"
                value={customModuleName}
                onChange={e => setCustomModuleName(e.target.value)}
                placeholder="e.g. Payments Integration"
                className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
              />
              <span className="text-[10px] text-muted-foreground/60 italic block">If you enter a name here, it will override the selection above.</span>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsAddModuleOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAddSelected}
              disabled={addingGapCases}
              className="btn-primary"
            >
              {addingGapCases ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...
                </>
              ) : (
                'Add Test Cases'
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
                className="h-9 w-9 p-0 border border-gray-300 cursor-pointer"
                title="Back to Overview"
              >
                <ChevronLeft size={20} className='flex mx-auto' />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary tracking-wider uppercase">Document View</span>
                  {/* {selectedSuite && selectedSuite.testCases?.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
                      Fully Covered
                    </span>
                  )} */}
                </div>
                <h1 className="text-xl font-bold text-foreground capitalize mt-0.5">
                  {selectedSrs.originalFileName || 'Requirement Specification'}
                </h1>
              </div>
            </div>

            {/* Sub-view Actions: Export Excel / Run Suite OR Generate Suite */}
            {selectedSuite && selectedSuite.testCases?.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleDownloadExcel(selectedSrs.originalFileName, selectedSrsModules)}
                  className="btn-secondary"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Export Excel
                </button>
                <button
                  onClick={() => {
                    const allDocTcs = selectedSrsModules.flatMap(m => m.features.flatMap(f => f.testCases))
                    handleOpenRunDialog('srs', selectedSrs.originalFileName, allDocTcs, selectedSuite._id)
                  }}
                  className="btn-primary"
                >
                  <PlayCircle className="w-4.5 h-4.5" /> Run Suite ({selectedSrsModules.reduce((acc, m) => acc + m.testCasesCount, 0)})
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  disabled={agentRunning !== null}
                  onClick={() => handleLocalRunAgent2(selectedSrs._id)}
                  className="btn-primary h-9 px-4 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  {agentRunning === 'agent2' && runningActionDocId === selectedSrs._id ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating test cases...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Generate Test Suite</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Accuracy Score Card (Full Width on Top) */}
          <div>
            {selectedAnalysis && selectedAnalysis.status === 'completed' && selectedAnalysis.agent0Score !== undefined && selectedAnalysis.agent0Score !== null ? (
              (() => {
                // Support both legacy string and new structured feedback
                const feedback = selectedAnalysis.agent0Feedback
                const isStructured = feedback && typeof feedback === 'object' && !Array.isArray(feedback)
                const structured = isStructured ? (feedback as Agent0Feedback) : null
                const legacyText = typeof feedback === 'string' ? feedback : null

                return (
                  <div className="border border-border bg-card/20 rounded-2xl p-6 flex flex-col lg:flex-row items-stretch justify-between gap-6">
                    {/* Left Column: 70% space for bullet-point feedback */}
                    <div className="lg:w-[70%] flex flex-col justify-between gap-4">
                      <div className="space-y-3">
                        <h4 className="text-lg font-extrabold text-foreground tracking-wide block">Accuracy Rating</h4>

                        {structured ? (
                          <div className={`space-y-3 text-xs ${!isFeedbackExpanded ? 'max-h-[160px] overflow-hidden' : 'max-h-[350px] overflow-y-auto pr-2 custom-scrollbar'}`}>
                            {/* Summary */}
                            <p className="text-sm text-foreground/80 leading-relaxed">{structured.summary}</p>

                            {/* Strengths */}
                            {structured.strengths?.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                  <CheckCircle2 className="w-3 h-3" /> Strengths
                                </span>
                                <ul className="space-y-1 pl-0.5">
                                  {structured.strengths.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2 text-muted-foreground leading-relaxed">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Missing Details */}
                            {structured.missing_details?.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                  <ShieldAlert className="w-3 h-3" /> Missing Details
                                </span>
                                <ul className="space-y-1 pl-0.5">
                                  {structured.missing_details.map((d, i) => (
                                    <li key={i} className="flex items-start gap-2 text-muted-foreground leading-relaxed">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                      {d}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Ambiguities */}
                            {structured.ambiguities?.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                  <AlertCircle className="w-3 h-3" /> Ambiguities
                                </span>
                                <ul className="space-y-1 pl-0.5">
                                  {structured.ambiguities.map((a, i) => (
                                    <li key={i} className="flex items-start gap-2 text-muted-foreground leading-relaxed">
                                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                                      {a}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Recommendations */}
                            {structured.recommendations?.length > 0 && (
                              <div>
                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                                  <Lightbulb className="w-3 h-3" /> Recommendations
                                </span>
                                <ul className="space-y-1 pl-0.5">
                                  {structured.recommendations.map((r, i) => (
                                    <li key={i} className="flex items-start gap-2 text-muted-foreground leading-relaxed">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                      {r}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Legacy string-based feedback fallback */
                          <div className={`text-xs text-muted-foreground leading-relaxed whitespace-pre-line ${!isFeedbackExpanded ? 'line-clamp-4 overflow-hidden' : 'max-h-[250px] overflow-y-auto pr-2 custom-scrollbar'}`}>
                            {legacyText}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                        >
                          {isFeedbackExpanded ? 'Read Less ▲' : 'Read More ▼'}
                        </button>

                        {selectedAnalysis.agent0Score < 70 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                            Score below 70%: Review details above.
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
                )
              })()
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

          {/* AI Gap Analysis & Test Case Suggestions Section */}
          {selectedAnalysis && selectedAnalysis.status === 'completed' && selectedAnalysis.agent0Status === 'completed' && (() => {
            const feedback = selectedAnalysis.agent0Feedback
            const isStructured = feedback && typeof feedback === 'object' && !Array.isArray(feedback)
            const structured = isStructured ? (feedback as Agent0Feedback) : null
            const hasGaps = structured && ((structured.missing_details?.length || 0) + (structured.ambiguities?.length || 0)) > 0
            const gapFillData = selectedAnalysis.gapFillData
            const gapFillStatus = selectedAnalysis.gapFillStatus
            const handleToggleGapCase = (tcId: string) => {
              setSelectedGapTestCases(prev => ({ ...prev, [tcId]: !prev[tcId] }))
            }

            if (!hasGaps) return null

            return (
              <div className="border border-border bg-card/20 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-base font-extrabold text-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      AI Gap Analysis & Suggestions
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {gapFillStatus === 'completed'
                        ? `${filledGaps.length} gaps analyzed with ${filledGaps.reduce((acc, g) => acc + g.suggested_test_cases.length, 0)} suggested test cases.`
                        : 'AI can auto-fill incomplete details and suggest test cases for gaps found in your document.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {gapFillStatus === 'completed' && filledGaps.length > 0 && (
                      <button
                        onClick={handleAddSelectedClick}
                        disabled={addingGapCases || Object.values(selectedGapTestCases).filter(Boolean).length === 0 || !selectedSuite}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        {addingGapCases ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Add Selected ({Object.values(selectedGapTestCases).filter(Boolean).length})
                      </button>
                    )}
                    <button
                      onClick={() => selectedSrs && runGapFill(selectedSrs._id)}
                      disabled={agentRunning === 'gapfill'}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
                    >
                      {agentRunning === 'gapfill' ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> {gapFillStatus === 'completed' ? 'Re-analyze Gaps' : 'Fill Gaps with AI'}</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Gap-fill results */}
                {gapFillStatus === 'completed' && filledGaps.length > 0 && (
                  <div className="space-y-3">
                    {filledGaps.map((gap) => {
                      const isExpanded = expandedGaps[gap.id] || false
                      const confidenceColors: Record<string, string> = {
                        high: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                        medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                        low: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                      }
                      return (
                        <div key={gap.id} className="border border-border/60 rounded-xl bg-card/30 overflow-hidden">
                          {/* Gap Header */}
                          <button
                            onClick={() => setExpandedGaps(prev => ({ ...prev, [gap.id]: !prev[gap.id] }))}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <Target className={`w-4 h-4 mt-0.5 flex-shrink-0 ${gap.category === 'missing_detail' ? 'text-amber-500' : 'text-yellow-500'}`} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-foreground">{gap.original_issue}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${confidenceColors[gap.confidence]}`}>
                                    {gap.confidence} confidence
                                  </span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${gap.category === 'missing_detail' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'}`}>
                                    {gap.category === 'missing_detail' ? 'Missing Detail' : 'Ambiguity'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[10px] text-muted-foreground">{gap.suggested_test_cases.length} test case(s)</span>
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            </div>
                          </button>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-3 border-t border-border/30">
                              {/* AI-Filled Detail */}
                              <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1 mb-1">
                                  <Sparkles className="w-3 h-3" /> AI-Suggested Detail
                                </span>
                                <p className="text-xs text-foreground/80 leading-relaxed">{gap.ai_filled_detail}</p>
                              </div>

                              {/* Suggested Test Cases */}
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Suggested Test Cases</span>
                                {gap.suggested_test_cases.map((tc: any) => (
                                  <label
                                    key={tc.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/20 ${selectedGapTestCases[tc.id] ? 'border-primary/50 bg-primary/5' : 'border-border/40'}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedGapTestCases[tc.id] || false}
                                      onChange={() => handleToggleGapCase(tc.id)}
                                      className="mt-0.5 rounded border-border accent-primary cursor-pointer"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-foreground">{tc.title}</span>
                                        {getPriorityBadge(tc.priority)}
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded border font-medium ${tc.scenario_type === 'negative' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : tc.scenario_type === 'edge_case' ? 'bg-violet-500/10 text-violet-500 border-violet-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                                          {tc.scenario_type}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{tc.description}</p>
                                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {tc.module}</span>
                                        <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {tc.feature}</span>
                                        <span>{tc.steps?.length || 0} steps</span>
                                      </div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

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
                          className={`flex-shrink-0 text-left px-4 py-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 cursor-pointer w-full ${isActive
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
                                className="btn-secondary animate-none h-8 px-3 text-xs"
                                title="Export module to Excel"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Export Excel
                              </button>
                              <button
                                onClick={() => {
                                  const allModTcs = activeMod.features.flatMap(f => f.testCases)
                                  handleOpenRunDialog('module', activeMod.name, allModTcs, selectedSuite._id)
                                }}
                                className="btn-primary h-8 px-3 text-xs"
                                title="Run module tests"
                              >
                                <PlayCircle className="w-3.5 h-3.5" /> Run Tests
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
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                              <span className="text-[10px] font-mono font-bold text-primary flex-shrink-0 min-w-[110px] whitespace-nowrap">{tc.id}</span>
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
        <div className="space-y-6 animate-fadeIn">
          {/* Project Header */}
          <div className="space-y-2 relative overflow-hidden pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary tracking-wider uppercase">Project Name</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground capitalize">{project.projectName}</h1>
            {project.projectDescription && (
              <p className="text-sm text-muted-foreground max-w-xl capitalize">{project.projectDescription}</p>
            )}
          </div>

          {/* 4 Small Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
            {/* Card 1: Requirement Docs */}
            <div className="border border-border bg-card/40 rounded-xl p-4 flex items-center justify-between hover:bg-card/60 transition-all duration-200">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Requirement Docs</span>
                <span className="text-2xl font-extrabold text-foreground mt-1">{srsDocumentsList.length}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2: Total Modules */}
            <div className="border border-border bg-card/40 rounded-xl p-4 flex items-center justify-between hover:bg-card/60 transition-all duration-200">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Modules</span>
                <span className="text-2xl font-extrabold text-foreground mt-1">{overallStats.totalModules}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3: Total Features */}
            <div className="border border-border bg-card/40 rounded-xl p-4 flex items-center justify-between hover:bg-card/60 transition-all duration-200">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Features</span>
                <span className="text-2xl font-extrabold text-foreground mt-1">{overallStats.totalFeatures}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Cpu className="w-5 h-5" />
              </div>
            </div>

            {/* Card 4: Generated Tests */}
            <div className="border border-border bg-card/40 rounded-xl p-4 flex items-center justify-between hover:bg-card/60 transition-all duration-200">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Generated Tests</span>
                  {overallStats.totalRegressive > 0 && (
                    <span className="text-[8px] bg-primary/10 text-primary border border-primary/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                      {overallStats.totalRegressive} Regressive
                    </span>
                  )}
                </div>
                <span className="text-2xl font-extrabold text-foreground mt-1">{overallStats.totalTests}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <FlaskConical className="w-5 h-5" />
              </div>
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
            <div className="border border-border bg-muted/40 text-muted-foreground p-4 rounded-xl flex items-center gap-3 text-sm animate-fadeIn">
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
                  <BrainCircuit className="w-8 h-8 text-primary animate-pulse" />
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

                  const unsplashImages = [
                    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
                    "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80"
                  ]
                  const imageUrl = unsplashImages[srsIdx % unsplashImages.length]

                  const isThisAgent1Running = agentRunning === 'agent1' && selectedSrsId === doc._id
                  const isThisAgent2Running = agentRunning === 'agent2' && selectedSrsId === doc._id

                  return (
                    <Card
                      key={doc._id}
                      onClick={() => router.push(`?srsId=${doc._id}`)}
                      className="relative w-full pt-0 cursor-pointer border border-border bg-card/20 hover:border-primary/40 hover:bg-card/40 transition-all duration-200 flex flex-col justify-between"
                    >
                      <div className="absolute top-0 left-0 right-0 z-30 aspect-video bg-black/25 rounded-t-xl pointer-events-none" />
                      <img
                        src={imageUrl}
                        alt="Document cover"
                        className="relative z-20 aspect-video w-full object-cover brightness-75 grayscale-30 dark:brightness-50 rounded-t-xl"
                      />
                      <CardHeader>
                        <CardAction onClick={e => e.stopPropagation()}>
                          {isAnalyzed && analysis && analysis.agent0Score !== null && analysis.agent0Score !== undefined ? (
                            <Badge variant="default" className="font-mono bg-primary/20 text-primary border border-primary/30">
                              {analysis.agent0Score}% Score
                            </Badge>
                          ) : isAnalyzing || isThisAgent1Running ? (
                            <Badge variant="secondary" className="animate-pulse">
                              Analyzing
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              New
                            </Badge>
                          )}
                        </CardAction>
                        <CardTitle className="truncate capitalize">{doc.originalFileName || 'Specification Document'}</CardTitle>
                        <CardDescription>
                          {doc.uploadedAt && `Uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter onClick={e => e.stopPropagation()}>
                        {!isAnalyzed ? (
                          <Button
                            onClick={() => handleLocalRunAgent1(doc._id)}
                            disabled={agentRunning !== null}
                            className="w-full btn-primary h-8 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                          >
                            {agentRunning === 'agent1' && runningActionDocId === doc._id ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting...</>
                            ) : (
                              'Analyze Document'
                            )}
                          </Button>
                        ) : !isSuiteGenerated ? (
                          <Button
                            onClick={() => handleLocalRunAgent2(doc._id)}
                            disabled={agentRunning !== null}
                            className="w-full btn-primary h-8 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                          >
                            {agentRunning === 'agent2' && runningActionDocId === doc._id ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                            ) : (
                              <><Sparkles className="w-3.5 h-3.5" /> Generate Test Suite</>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => router.push(`?srsId=${doc._id}`)}
                            className="w-full btn-secondary h-8 text-xs font-semibold"
                          >
                            View Modules
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
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
