'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderOpen, FolderClosed, Layers, Cpu, PlayCircle, Eye, Loader2,
  AlertCircle, Sparkles, BrainCircuit, FlaskConical, Search, ChevronDown,
  ChevronRight, Play, Info, FileText, ArrowRight, Settings, Plus, CheckCircle2
} from 'lucide-react'
import { TestCase } from '../types'
import { SrsUploadSection } from './SrsUploadSection'
import { getPriorityBadge } from '../helpers/utils'
import { executionService } from '../services/executionService'
import { useProject } from '../contexts/ProjectContext'
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

    srsDocumentsList.forEach(doc => {
      const tree = getSrsTreeData(doc._id)
      totalModules += tree.length
      tree.forEach(m => {
        totalFeatures += m.features.length
        totalTests += m.testCasesCount
      })
    })

    return { totalModules, totalFeatures, totalTests }
  }, [srsDocumentsList, getSrsTreeData])

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
        router.push(`/dashboard/${project._id}/execution?runId=${res.runId}`)
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
              <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
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

      {/* Header Panel */}
      <div className="border border-border bg-card/40 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-60 h-60 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary tracking-wider uppercase">Project Workspace</span>
              <span className="px-2 py-0.5 rounded-full border bg-muted text-[10px] font-semibold">
                {srsDocumentsList.length} SRS document{srsDocumentsList.length > 1 ? 's' : ''}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.projectName}</h1>
            {project.projectDescription && (
              <p className="text-sm text-muted-foreground max-w-xl">{project.projectDescription}</p>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/50">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">SRS Documents</span>
            <span className="text-xl font-extrabold text-foreground">{srsDocumentsList.length}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Modules</span>
            <span className="text-xl font-extrabold text-foreground">{overallStats.totalModules}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Features</span>
            <span className="text-xl font-extrabold text-foreground">{overallStats.totalFeatures}</span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Generated Tests</span>
            <span className="text-xl font-extrabold text-foreground">{overallStats.totalTests}</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/50">
          <SrsUploadSection
            projectId={project._id}
            srsDocuments={project.srsDocuments ?? []}
            onSrsUploaded={() => {
              refreshProject()
            }}
          />
        </div>
      </div>

      {agentError && (
        <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {agentError}
        </div>
      )}

      {/* Unified Multi-SRS Tree Explorer */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground">Unified Explorer (SRS tree)</h2>

        {srsDocumentsList.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl bg-card/10 flex flex-col items-center justify-center p-16 text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <BrainCircuit className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <h3 className="font-semibold text-lg">Upload an SRS Document</h3>
              <p className="text-sm text-muted-foreground">
                Upload your first SRS document above to generate structured modules and test suites.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {srsDocumentsList.map((doc, srsIdx) => {
              const isSrsExpanded = !!expandedSrs[doc._id]
              const targetSrsId = doc._id === 'legacy' ? null : doc._id
              const analysis = requirementAnalyses.find(r => r.srsDocumentId === targetSrsId) || null
              const suite = testSuites.find(t => t.srsDocumentId === targetSrsId) || null

              const isAnalyzed = analysis && analysis.status === 'completed'
              const isSuiteGenerated = suite && suite.testCases?.length > 0

              const srsModules = getSrsTreeData(doc._id)
              const totalTests = srsModules.reduce((acc, m) => acc + m.testCasesCount, 0)

              return (
                <div
                  key={doc._id}
                  className="border rounded-2xl bg-card/30 border-border/80 overflow-hidden"
                >
                  {/* SRS Document Header Card (Tree Level 1) */}
                  <div
                    onClick={() => toggleSrs(doc._id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-muted/10 hover:bg-muted/20 cursor-pointer select-none gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="text-muted-foreground p-0.5 flex-shrink-0">
                        {isSrsExpanded ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                          SRS {srsIdx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-foreground truncate mt-0.5">
                          {doc.originalFileName}
                        </h3>
                      </div>
                    </div>

                    {/* Quick status/actions inside SRS Header Card */}
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap" onClick={e => e.stopPropagation()}>
                      {!isAnalyzed ? (
                        <button
                          onClick={() => runAgent1(doc._id)}
                          disabled={agentRunning === 'agent1'}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-60 cursor-pointer"
                        >
                          {agentRunning === 'agent1' ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                          ) : (
                            <><Sparkles className="w-3.5 h-3.5" /> Run Analysis</>
                          )}
                        </button>
                      ) : !isSuiteGenerated ? (
                        <button
                          onClick={() => runAgent2(doc._id)}
                          disabled={agentRunning === 'agent2'}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-60 cursor-pointer"
                        >
                          {agentRunning === 'agent2' ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                          ) : (
                            <><FlaskConical className="w-3.5 h-3.5" /> Generate Suite</>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Fully Covered
                          </span>
                          <button
                            onClick={() => handleOpenRunDialog('srs', doc.originalFileName, suite.testCases, suite._id)}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" /> Run SRS Suite ({totalTests})
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modules Tree under SRS (Tree Level 2) */}
                  {isSrsExpanded && (
                    <div className="p-5 border-t border-border/40 space-y-4 bg-muted/5">
                      {isAnalyzed && analysis && (analysis.agent0Score !== undefined && analysis.agent0Score !== null) && (
                        <div className="rounded-2xl border bg-card/60 backdrop-blur-md border-border/60 shadow-sm overflow-hidden">
                          <div
                            onClick={() => setExpandedSrsScores(prev => ({ ...prev, [doc._id]: !prev[doc._id] }))}
                            className="flex items-center justify-between p-5 cursor-pointer select-none hover:bg-muted/10 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              {/* Circular Gauge / Percentage Indicator */}
                              <div className="relative flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-full bg-background border border-border">
                                <svg className="w-12 h-12 transform -rotate-90">
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    className="stroke-muted"
                                    strokeWidth="3.5"
                                    fill="transparent"
                                  />
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    className={analysis.agent0Score >= 70 ? "stroke-emerald-500" : "stroke-amber-500"}
                                    strokeWidth="3.5"
                                    fill="transparent"
                                    strokeDasharray={`${2 * Math.PI * 20}`}
                                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - (analysis.agent0Score || 0) / 100)}`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <span className={`absolute text-xs font-black ${analysis.agent0Score >= 70 ? "text-emerald-400" : "text-amber-400"}`}>
                                  {analysis.agent0Score}%
                                </span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400">
                                    <BrainCircuit className="w-3 h-3" /> Agent 0
                                  </span>
                                  <h4 className="text-xs font-bold text-foreground">SRS Detailing Analysis</h4>
                                </div>
                              </div>
                            </div>

                            <div className="text-muted-foreground p-1 hover:bg-muted/20 rounded-lg transition-colors">
                              {expandedSrsScores[doc._id] ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5" />}
                            </div>
                          </div>

                          {expandedSrsScores[doc._id] && (
                            <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border/40">
                              <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl whitespace-pre-line">
                                {analysis.agent0Feedback}
                              </p>

                              {analysis.agent0Score < 70 && (
                                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 leading-relaxed">
                                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-semibold">Notice:</span> The SRS score is less than 70%. You can update your SRS or go through the test cases and update them if required.
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {!isAnalyzed ? (
                        <div className="text-center py-6 text-xs text-muted-foreground leading-relaxed">
                          ⚠️ This SRS document has not been analyzed yet. Run requirements analysis above to explore its modules.
                        </div>
                      ) : srsModules.length === 0 ? (
                        <div className="text-center py-6 text-xs text-muted-foreground leading-relaxed">
                          No modules found inside this SRS document.
                        </div>
                      ) : (
                        srsModules.map((mod) => {
                          const modKey = `${doc._id}::${mod.name}`
                          const isModExpanded = !!expandedModules[modKey]

                          return (
                            <div
                              key={mod.name}
                              className={`border rounded-2xl bg-card transition-all duration-200 ${isModExpanded ? 'border-border shadow-sm' : 'border-border/60 hover:border-border'}`}
                            >
                              {/* Module Header Row */}
                              <div
                                onClick={() => toggleModule(doc._id, mod.name)}
                                className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-3.5 min-w-0 pr-6">
                                  <div className={`p-2 rounded-xl border transition-colors ${isModExpanded ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/40 text-muted-foreground border-border/40'}`}>
                                    {isModExpanded ? <FolderOpen className="w-4.5 h-4.5" /> : <FolderClosed className="w-4.5 h-4.5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-foreground line-clamp-1">{mod.name}</h3>
                                    {mod.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{mod.description}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-[10px] font-semibold text-muted-foreground">
                                      <Layers className="w-2.5 h-2.5" /> {mod.features.length} Features
                                    </span>
                                    {mod.testCasesCount > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                                        <FlaskConical className="w-2.5 h-2.5" /> {mod.testCasesCount} Tests
                                      </span>
                                    )}
                                  </div>

                                  {isSuiteGenerated && mod.testCasesCount > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const allModTcs = mod.features.flatMap(f => f.testCases)
                                        handleOpenRunDialog('module', mod.name, allModTcs, suite._id)
                                      }}
                                      title="Run all tests in module"
                                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                                    >
                                      <PlayCircle className="w-4 h-4" />
                                    </button>
                                  )}

                                  <div className="text-muted-foreground p-0.5">
                                    {isModExpanded ? <ChevronDown className="w-4.5 h-4.5" /> : <ChevronRight className="w-4.5 h-4.5" />}
                                  </div>
                                </div>
                              </div>

                              {/* Features Tree under Module (Tree Level 3) */}
                              {isModExpanded && (
                                <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-4 bg-muted/5">
                                  {mod.features.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-2 pl-3">No features found in this module.</p>
                                  ) : (
                                    mod.features.map(feat => {
                                      const featKey = `${doc._id}::${mod.name}::${feat.name}`
                                      const isFeatExpanded = !!expandedFeatures[featKey]

                                      return (
                                        <div
                                          key={feat.name}
                                          className={`border rounded-xl bg-card overflow-hidden transition-all ${isFeatExpanded ? 'border-border' : 'border-border/50'}`}
                                        >
                                          {/* Feature Header Row */}
                                          <div
                                            onClick={() => toggleFeature(doc._id, mod.name, feat.name)}
                                            className="flex items-center justify-between px-4 py-3 bg-muted/20 cursor-pointer select-none"
                                          >
                                            <div className="flex items-center gap-2.5 min-w-0 pr-6">
                                              <Cpu className="w-4 h-4 text-primary flex-shrink-0" />
                                              <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-foreground line-clamp-1">{feat.name}</h4>
                                                {feat.description && (
                                                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{feat.description}</p>
                                                )}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                              <span className="text-[10px] bg-border/60 text-foreground px-1.5 py-0.5 rounded font-mono font-medium">
                                                {feat.testCases.length} tests
                                              </span>

                                              {isSuiteGenerated && feat.testCases.length > 0 && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleOpenRunDialog('feature', feat.name, feat.testCases, suite._id)
                                                  }}
                                                  title="Run all tests in feature"
                                                  className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                                                >
                                                  <Play className="w-3 h-3 fill-current" />
                                                </button>
                                              )}

                                              <div className="text-muted-foreground p-0.5">
                                                {isFeatExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                              </div>
                                            </div>
                                          </div>

                                          {/* Test Cases Tree under Feature (Tree Level 4) */}
                                          {isFeatExpanded && (
                                            <div className="p-4 border-t border-border/40 bg-card space-y-3">
                                              {feat.testCases.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                                                  <FlaskConical className="w-6 h-6 text-muted-foreground/60" />
                                                  <p className="text-xs text-muted-foreground">No test cases generated for this feature yet.</p>
                                                  {isSuiteGenerated && (
                                                    <button
                                                      onClick={() => runAgent2(doc._id)}
                                                      className="text-[11px] text-primary font-bold hover:underline inline-flex items-center gap-1 mt-1 cursor-pointer"
                                                    >
                                                      Generate suite <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                  {feat.testCases.map((tc) => (
                                                    <div
                                                      key={tc.id}
                                                      onClick={() => handleEditTestCase(tc.id)}
                                                      className="border border-border/60 hover:border-primary/30 hover:bg-primary/5 bg-muted/10 p-3 rounded-xl flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer transition-all duration-200"
                                                    >
                                                      <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between gap-2">
                                                          <span className="text-[10px] font-mono font-bold text-primary">{tc.id}</span>
                                                          <div className="flex items-center gap-1">
                                                            {getPriorityBadge(tc.priority)}
                                                            {tc.scenario_type && (
                                                              <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${tc.scenario_type === 'positive' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' : 'bg-rose-500/5 text-rose-400 border-rose-500/10'}`}>
                                                                {tc.scenario_type}
                                                              </span>
                                                            )}
                                                          </div>
                                                        </div>
                                                        <h5 className="text-xs font-semibold text-foreground line-clamp-1">{tc.title}</h5>
                                                        {tc.description && (
                                                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{tc.description}</p>
                                                        )}
                                                      </div>

                                                      <div className="flex items-center justify-between border-t border-border/40 pt-2 mt-3 text-[10px] text-muted-foreground">
                                                        <span className="font-mono">{tc.steps.length} execution steps</span>
                                                        <div className="flex items-center gap-1">
                                                          {isSuiteGenerated && (
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleOpenRunDialog('testcase', tc.id, [tc], suite._id)
                                                              }}
                                                              title="Run test case"
                                                              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                                                            >
                                                              <PlayCircle className="w-4.5 h-4.5" />
                                                            </button>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
