'use client'

import React, { useState, useMemo } from 'react'
import {
  FolderOpen, FolderClosed, Layers, Cpu, PlayCircle, Eye, Loader2,
  AlertCircle, Sparkles, BrainCircuit, FlaskConical, Search, ChevronDown,
  ChevronRight, Play, Info, FileText, ArrowRight, Settings
} from 'lucide-react'
import { Project, TestCase } from '../types'
import { getPriorityBadge } from '../helpers/utils'
import { executionService } from '../services/executionService'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ModuleExplorerViewProps {
  projectId: string
  project: Project
  requirements: any | null
  testSuiteData: any | null
  onNavigateToTab: (tab: 'projects' | 'upload' | 'requirements' | 'testcases' | 'execution') => void
  onSelectTestCase: (id: string) => void
  onRunAgent1?: () => void
  onRunAgent2?: () => void
  onRunStarted?: (runId: string) => void
  agentRunning?: 'agent1' | 'agent2' | null
  agentError?: string | null
}

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

export function ModuleExplorerView({
  projectId,
  project,
  requirements,
  testSuiteData,
  onNavigateToTab,
  onSelectTestCase,
  onRunAgent1,
  onRunAgent2,
  onRunStarted,
  agentRunning,
  agentError
}: ModuleExplorerViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({})

  // Run execution dialog state
  const [isRunOpen, setIsRunOpen] = useState(false)
  const [runBaseUrl, setRunBaseUrl] = useState('http://localhost:3000')
  const [runHeadless, setRunHeadless] = useState(true)
  const [starting, setStarting] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  // Target of execution: { type: 'project' | 'module' | 'feature' | 'testcase', name?: string, ids?: string[] }
  const [runTarget, setRunTarget] = useState<{
    type: 'project' | 'module' | 'feature' | 'testcase'
    name: string
    ids: string[]
  } | null>(null)

  // Toggle helpers
  const toggleModule = (modName: string) => {
    setExpandedModules(prev => ({ ...prev, [modName]: !prev[modName] }))
  }

  const toggleFeature = (featKey: string) => {
    setExpandedFeatures(prev => ({ ...prev, [featKey]: !prev[featKey] }))
  }

  // Build the hierarchical Module -> Feature -> Test Case data structure
  const modulesList = useMemo(() => {
    const modulesMap = new Map<string, { description?: string, features: Map<string, { description?: string, testCases: TestCase[] }> }>()

    // 1. Add structure from Requirements Analysis (Agent 1)
    if (requirements?.modules) {
      requirements.modules.forEach((mod: any) => {
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

    // 2. Add Test Cases from Test Suite (Agent 2) and map to structures
    if (testSuiteData?.testCases) {
      testSuiteData.testCases.forEach((tc: TestCase) => {
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
        
        // Avoid duplicate push if already present
        if (!featGroup.testCases.some(t => t.id === tc.id)) {
          featGroup.testCases.push(tc)
        }
      })
    }

    // Convert Map back to arrays
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

      // Sort features by name
      features.sort((a, b) => a.name.localeCompare(b.name))

      result.push({
        name: modName,
        description: modVal.description,
        features,
        testCasesCount: totalTests
      })
    })

    // Sort modules by name
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [requirements, testSuiteData])

  // Filter based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery) return modulesList

    const query = searchQuery.toLowerCase()
    return modulesList.map(mod => {
      const matchModName = mod.name.toLowerCase().includes(query)
      const matchModDesc = mod.description?.toLowerCase().includes(query) || false

      const filteredFeatures = mod.features.map(feat => {
        const matchFeatName = feat.name.toLowerCase().includes(query)
        const matchFeatDesc = feat.description?.toLowerCase().includes(query) || false

        const filteredTestCases = feat.testCases.filter(tc => 
          tc.title.toLowerCase().includes(query) || 
          tc.id.toLowerCase().includes(query) || 
          tc.description.toLowerCase().includes(query)
        )

        if (matchFeatName || matchFeatDesc || filteredTestCases.length > 0) {
          return { ...feat, testCases: matchFeatName ? feat.testCases : filteredTestCases }
        }
        return null
      }).filter(Boolean) as FeatureGroup[]

      if (matchModName || matchModDesc || filteredFeatures.length > 0) {
        return {
          ...mod,
          features: matchModName ? mod.features : filteredFeatures,
          testCasesCount: matchModName 
            ? mod.testCasesCount 
            : filteredFeatures.reduce((acc, f) => acc + f.testCases.length, 0)
        }
      }
      return null
    }).filter(Boolean) as ModuleGroup[]
  }, [modulesList, searchQuery])

  // Execute test runner dialog helpers
  const handleOpenRunDialog = (
    type: 'project' | 'module' | 'feature' | 'testcase',
    name: string,
    testCases: TestCase[]
  ) => {
    const ids = testCases.map(tc => tc.id)
    if (ids.length === 0) return
    setRunTarget({ type, name, ids })
    setRunError(null)
    setIsRunOpen(true)
  }

  const handleStartRun = async () => {
    if (!runTarget || !testSuiteData?._id) return
    setRunError(null)
    if (!/^https?:\/\//i.test(runBaseUrl.trim())) {
      setRunError('Base URL must start with http:// or https://')
      return
    }

    try {
      setStarting(true)
      const res = await executionService.startExecution({
        projectId,
        testSuiteId: testSuiteData._id,
        baseUrl: runBaseUrl.trim(),
        headless: runHeadless,
        testCaseIds: runTarget.ids
      })
      if (res.success) {
        setIsRunOpen(false)
        onRunStarted?.(res.runId)
      }
    } catch (err: any) {
      setRunError(err?.response?.data?.error || err?.message || 'Failed to start execution')
    } finally {
      setStarting(false)
    }
  }

  const allTestCases = useMemo(() => {
    if (!testSuiteData?.testCases) return []
    return testSuiteData.testCases
  }, [testSuiteData])

  const totalFeatures = useMemo(() => {
    let count = 0
    modulesList.forEach(m => { count += m.features.length })
    return count
  }, [modulesList])

  // Action: go to edit test case
  const handleEditTestCase = (id: string) => {
    onSelectTestCase(id)
    onNavigateToTab('testcases')
  }

  // Active status parsing
  const isAnalyzed = project.status === 'analyzed' || project.status === 'tests_generated'
  const isTestsGenerated = project.status === 'tests_generated' && allTestCases.length > 0

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
        {/* Decorative backdrop elements */}
        <div className="absolute -right-24 -top-24 w-60 h-60 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary tracking-wider uppercase">Project Modules</span>
              <span className="px-2 py-0.5 rounded-full border bg-muted text-[10px] font-semibold">
                {project.originalFileName}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.projectName}</h1>
            {project.projectDescription && (
              <p className="text-sm text-muted-foreground max-w-xl">{project.projectDescription}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick action buttons depending on state */}
            {!isAnalyzed && onRunAgent1 && (
              <button
                onClick={onRunAgent1}
                disabled={agentRunning === 'agent1'}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-60"
              >
                {agentRunning === 'agent1' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Document...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="w-4 h-4" /> Run Requirements Analysis
                  </>
                )}
              </button>
            )}

            {isAnalyzed && !isTestsGenerated && onRunAgent2 && (
              <button
                onClick={onRunAgent2}
                disabled={agentRunning === 'agent2'}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-60"
              >
                {agentRunning === 'agent2' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating Tests...
                  </>
                ) : (
                  <>
                    <FlaskConical className="w-4 h-4" /> Generate Test Suite
                  </>
                )}
              </button>
            )}

            {isTestsGenerated && (
              <>
                <button
                  onClick={() => onNavigateToTab('testcases')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border border-border bg-card hover:bg-muted transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" /> Open Suite Builder
                </button>
                <button
                  onClick={() => handleOpenRunDialog('project', project.projectName, allTestCases)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  <PlayCircle className="w-4.5 h-4.5" /> Run Full Suite
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Strip */}
        {isAnalyzed && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border/50">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Modules</span>
              <span className="text-xl font-extrabold text-foreground">{modulesList.length}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Features</span>
              <span className="text-xl font-extrabold text-foreground">{totalFeatures}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Generated Tests</span>
              <span className="text-xl font-extrabold text-foreground">{allTestCases.length}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Coverage Status</span>
              <span className={`text-xs font-bold inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full border ${isTestsGenerated ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                {isTestsGenerated ? 'Fully Covered' : 'Requirements Only'}
              </span>
            </div>
          </div>
        )}
      </div>

      {agentError && (
        <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {agentError}
        </div>
      )}

      {/* Main Explorer View */}
      {isAnalyzed ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-border bg-card/20 p-3 rounded-xl">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search modules, features, tests..."
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
              />
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Showing {filteredModules.length} of {modulesList.length} Modules
            </div>
          </div>

          {/* Module List Accordions */}
          <div className="space-y-3">
            {filteredModules.map((mod) => {
              const isModExpanded = !!expandedModules[mod.name]
              return (
                <div
                  key={mod.name}
                  className={`border rounded-2xl bg-card transition-all duration-200 ${isModExpanded ? 'border-border shadow-sm' : 'border-border/60 hover:border-border'}`}
                >
                  {/* Module Header */}
                  <div
                    onClick={() => toggleModule(mod.name)}
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

                      {/* Module action button */}
                      {isTestsGenerated && mod.testCasesCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const allModTcs = mod.features.flatMap(f => f.testCases)
                            handleOpenRunDialog('module', mod.name, allModTcs)
                          }}
                          title="Run all tests in module"
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                        >
                          <PlayCircle className="w-4 h-4" />
                        </button>
                      )}

                      <div className="text-muted-foreground p-0.5">
                        {isModExpanded ? <ChevronDown className="w-4.5 h-4.5" /> : <ChevronRight className="w-4.5 h-4.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Module Content */}
                  {isModExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-4 bg-muted/5">
                      {mod.features.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 pl-3">No features found in this module.</p>
                      ) : (
                        mod.features.map(feat => {
                          const featKey = `${mod.name}::${feat.name}`
                          const isFeatExpanded = !!expandedFeatures[featKey]

                          return (
                            <div
                              key={feat.name}
                              className={`border rounded-xl bg-card overflow-hidden transition-all ${isFeatExpanded ? 'border-border' : 'border-border/50'}`}
                            >
                              {/* Feature Header */}
                              <div
                                onClick={() => toggleFeature(featKey)}
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

                                  {/* Feature action button */}
                                  {isTestsGenerated && feat.testCases.length > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleOpenRunDialog('feature', feat.name, feat.testCases)
                                      }}
                                      title="Run all tests in feature"
                                      className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                                    >
                                      <Play className="w-3 h-3 fill-current" />
                                    </button>
                                  )}

                                  <div className="text-muted-foreground p-0.5">
                                    {isFeatExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </div>
                                </div>
                              </div>

                              {/* Feature Content */}
                              {isFeatExpanded && (
                                <div className="p-4 border-t border-border/40 bg-card space-y-3">
                                  {feat.testCases.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
                                      <FlaskConical className="w-6 h-6 text-muted-foreground/60" />
                                      <p className="text-xs text-muted-foreground">No test cases generated for this feature yet.</p>
                                      {onRunAgent2 && (
                                        <button
                                          onClick={onRunAgent2}
                                          className="text-[11px] text-primary font-bold hover:underline inline-flex items-center gap-1 mt-1"
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
                                          className="border border-border/60 hover:border-primary/20 bg-muted/10 p-3 rounded-xl flex flex-col justify-between hover:shadow-sm transition-all"
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
                                              <button
                                                onClick={() => handleEditTestCase(tc.id)}
                                                title="Edit steps in Builder"
                                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                              >
                                                <Eye className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={() => handleOpenRunDialog('testcase', tc.id, [tc])}
                                                title="Run test case"
                                                className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                                              >
                                                <PlayCircle className="w-3.5 h-3.5" />
                                              </button>
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
            })}

            {filteredModules.length === 0 && (
              <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/20 text-xs text-muted-foreground">
                No modules match your search query. Try clearing the filter.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Requirements Not Analyzed State */
        <div className="border border-dashed border-border rounded-2xl bg-card/10 flex flex-col items-center justify-center p-16 text-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BrainCircuit className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className="font-semibold text-lg">Requirements Analysis Required</h3>
            <p className="text-sm text-muted-foreground">
              To browse modules and features, first analyze the project document using Agent 1.
            </p>
          </div>
          {onRunAgent1 && (
            <button
              onClick={onRunAgent1}
              disabled={agentRunning === 'agent1'}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {agentRunning === 'agent1' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Run Requirements Analysis</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
