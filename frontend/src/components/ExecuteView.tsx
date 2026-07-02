'use client'

import React, { useState, useEffect, useRef } from 'react'
import { executionService } from '../services/executionService'
import {
  Terminal, ShieldAlert, CheckCircle, Loader, Image as ImageIcon,
  ChevronDown, ChevronRight, Wrench, Clock, AlertCircle, CircleDot,
  BarChart3, Play, XCircle
} from 'lucide-react'

interface StepState {
  status: 'pending' | 'running' | 'passed' | 'failed'
  message: string
  screenshot?: string
  recovery?: any
  duration?: number
}

interface TestCaseState {
  status: 'pending' | 'running' | 'passed' | 'failed'
  duration?: number
}

interface ExecuteViewProps {
  runId: string
  testCases: any[]
}

export function ExecuteView({ runId, testCases = [] }: ExecuteViewProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [runStatus, setRunStatus] = useState<'pending' | 'running' | 'completed' | 'failed'>('pending')
  const [stepsMap, setStepsMap] = useState<Record<string, StepState>>({})
  const [testCaseMap, setTestCaseMap] = useState<Record<string, TestCaseState>>({})
  const [expandedTCs, setExpandedTCs] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState({ total: testCases.length, passed: 0, failed: 0, skipped: 0 })
  const [activeScreenshot, setActiveScreenshot] = useState<string | null>(null)
  const logTerminalEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Initialize all steps and test cases as pending
    const initialSteps: typeof stepsMap = {}
    const initialTCs: typeof testCaseMap = {}

    testCases.forEach(tc => {
      const tcId = tc.id || tc._id
      initialTCs[tcId] = { status: 'pending' }
      tc.steps?.forEach((step: any) => {
        const key = `${tcId}_step_${step.step_number}`
        initialSteps[key] = { status: 'pending', message: 'Awaiting execution' }
      })
    })

    setStepsMap(initialSteps)
    setTestCaseMap(initialTCs)
    setLogs(['[SYSTEM] Initializing test runner...'])

    // Open SSE stream
    const streamUrl = executionService.getStreamUrl(runId)
    const es = new EventSource(streamUrl)
    eventSourceRef.current = es

    es.onopen = () => {
      setLogs(prev => [...prev, '[SSE] ✓ Connected to live stream.'])
    }
    es.onerror = () => {
      setLogs(prev => [...prev, '[SSE] ⚠ Connection interrupted. Attempting reconnect...'])
    }
    es.onmessage = (event) => {
      try {
        handleSSEEvent(JSON.parse(event.data))
      } catch (_) {}
    }

    return () => {
      eventSourceRef.current?.close()
    }
  }, [runId])

  useEffect(() => {
    logTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleSSEEvent = (event: any) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false })

    switch (event.type) {
      case 'RUN_STARTED':
        setRunStatus('running')
        addLog(`[${ts}] 🚀 Playwright browser launched. Starting test execution.`, 'info')
        break

      case 'TEST_STARTED':
        setTestCaseMap(prev => ({ ...prev, [event.testCaseId]: { status: 'running' } }))
        setExpandedTCs(prev => new Set(prev).add(event.testCaseId))
        addLog(`[${ts}] ▶ Starting: ${event.title}`, 'info')
        break

      case 'STEP_STARTED':
        setStepsMap(prev => ({
          ...prev,
          [`${event.testCaseId}_step_${event.stepNumber}`]: {
            status: 'running',
            message: event.message
          }
        }))
        addLog(`[${ts}]   → [${event.action}]${event.target ? ` on "${event.target}"` : ''} — ${event.message}`, 'info')
        break

      case 'RECOVERY_STARTED':
        setStepsMap(prev => ({
          ...prev,
          [`${event.testCaseId}_step_${event.stepNumber}`]: {
            ...prev[`${event.testCaseId}_step_${event.stepNumber}`],
            status: 'running',
            message: '⚠️ Step failed. AI recovery analyzing...',
            screenshot: event.screenshot
          }
        }))
        addLog(`[${ts}]   ⚠ Step failed. Agent 3 analyzing DOM for recovery...`, 'warn')
        break

      case 'RECOVERY_APPLIED':
        setStepsMap(prev => ({
          ...prev,
          [`${event.testCaseId}_step_${event.stepNumber}`]: {
            ...prev[`${event.testCaseId}_step_${event.stepNumber}`],
            status: 'running',
            message: `🛠 Healed: ${event.message}`,
            recovery: event.recovery
          }
        }))
        addLog(`[${ts}]   🛠 Recovery applied: [${event.recovery?.action}] on "${event.recovery?.target}"`, 'warn')
        break

      case 'STEP_PASSED':
        setStepsMap(prev => ({
          ...prev,
          [`${event.testCaseId}_step_${event.stepNumber}`]: {
            ...prev[`${event.testCaseId}_step_${event.stepNumber}`],
            status: 'passed',
            message: 'Passed',
            duration: event.duration
          }
        }))
        addLog(`[${ts}]   ✓ Step ${event.stepNumber} passed${event.duration ? ` (${event.duration}ms)` : ''}`, 'pass')
        break

      case 'STEP_FAILED':
        setStepsMap(prev => ({
          ...prev,
          [`${event.testCaseId}_step_${event.stepNumber}`]: {
            ...prev[`${event.testCaseId}_step_${event.stepNumber}`],
            status: 'failed',
            message: event.message,
            screenshot: event.screenshot
          }
        }))
        addLog(`[${ts}]   ✗ Step ${event.stepNumber} FAILED: ${event.message}`, 'fail')
        break

      case 'TEST_FINISHED':
        setTestCaseMap(prev => ({
          ...prev,
          [event.testCaseId]: { status: event.status, duration: event.duration }
        }))
        addLog(
          `[${ts}] ${event.status === 'passed' ? '✓' : '✗'} ${event.status.toUpperCase()}: Test case finished.`,
          event.status === 'passed' ? 'pass' : 'fail'
        )
        // Auto-collapse passed tests, keep failed ones open
        if (event.status === 'passed') {
          setExpandedTCs(prev => {
            const next = new Set(prev)
            next.delete(event.testCaseId)
            return next
          })
        }
        break

      case 'RUN_FINISHED':
        setRunStatus('completed')
        setSummary(event.summary)
        eventSourceRef.current?.close()
        addLog(`[${ts}] ══════════════════════════════`, 'info')
        addLog(`[${ts}] RUN COMPLETE — ✓ ${event.summary.passed} Passed | ✗ ${event.summary.failed} Failed | ⊘ ${event.summary.skipped} Skipped`, 'info')
        addLog(`[${ts}] ══════════════════════════════`, 'info')
        break
    }
  }

  const addLog = (line: string, _type: 'info' | 'pass' | 'fail' | 'warn') => {
    setLogs(prev => [...prev, `${_type}:::${line}`])
  }

  const toggleExpand = (tcId: string) => {
    setExpandedTCs(prev => {
      const next = new Set(prev)
      if (next.has(tcId)) next.delete(tcId)
      else next.add(tcId)
      return next
    })
  }

  // ── Helpers ──
  const stepStatusIcon = (status: string) => {
    if (status === 'running') return <Loader className="w-3.5 h-3.5 animate-spin text-amber-400" />
    if (status === 'passed') return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
    if (status === 'failed') return <XCircle className="w-3.5 h-3.5 text-rose-400" />
    return <div className="w-3.5 h-3.5 rounded-full border border-border/60" />
  }

  const tcStatusIcon = (status: string) => {
    if (status === 'running') return <Loader className="w-4 h-4 animate-spin text-amber-400" />
    if (status === 'passed') return <CheckCircle className="w-4 h-4 text-emerald-400" />
    if (status === 'failed') return <ShieldAlert className="w-4 h-4 text-rose-400" />
    return <CircleDot className="w-4 h-4 text-border" />
  }

  const logLineColor = (line: string) => {
    if (line.startsWith('pass:::')) return 'text-emerald-400'
    if (line.startsWith('fail:::')) return 'text-rose-400'
    if (line.startsWith('warn:::')) return 'text-amber-400'
    return 'text-emerald-300/80'
  }

  const logLineText = (line: string) => line.replace(/^(pass|fail|warn|info):::/, '')

  const allScreenshots = Object.entries(stepsMap)
    .filter(([, v]) => v.screenshot)
    .map(([key, v]) => ({ key, url: v.screenshot!, message: v.message }))

  const passPercent = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0

  return (
    <div className="space-y-5">
      {/* ── Summary Bar ── */}
      <div className="border border-border bg-card rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">Execution Monitor</h1>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ml-1 ${
                runStatus === 'running' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse' :
                runStatus === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                'bg-muted border-border text-muted-foreground'
              }`}>
                {runStatus}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Playwright automation with AI self-healing recovery</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{summary.passed}</div>
              <div className="text-[10px] uppercase font-bold text-emerald-500/70 tracking-wider">Passed</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-400">{summary.failed}</div>
              <div className="text-[10px] uppercase font-bold text-rose-500/70 tracking-wider">Failed</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{summary.skipped}</div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Skipped</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {summary.total > 0 && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Progress</span>
              <span>{passPercent}% passed</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${passPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5 items-start">
        {/* ── Left: Test Case Accordion ── */}
        <div className="md:col-span-2 border border-border rounded-xl bg-card/10 overflow-hidden">
          <div className="bg-muted/30 border-b border-border px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-primary" />
              Test Cases ({testCases.length})
            </h3>
          </div>
          <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
            {testCases.map((tc, tcIdx) => {
              const tcId = tc.id || tc._id
              const tcState = testCaseMap[tcId] || { status: 'pending' }
              const isExpanded = expandedTCs.has(tcId)

              return (
                <div key={tcId || tcIdx}>
                  {/* TC Header Row */}
                  <button
                    onClick={() => toggleExpand(tcId)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors ${
                      tcState.status === 'running' ? 'bg-amber-500/5' :
                      tcState.status === 'passed' ? 'bg-emerald-500/5' :
                      tcState.status === 'failed' ? 'bg-rose-500/5' : ''
                    }`}
                  >
                    {tcStatusIcon(tcState.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-primary">{tc.id || `TC-${tcIdx + 1}`}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">{tc.title}</p>
                    </div>
                    {tcState.duration && (
                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />{(tcState.duration / 1000).toFixed(1)}s
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    }
                  </button>

                  {/* Steps (expanded) */}
                  {isExpanded && (
                    <div className="bg-card/30 border-t border-border/40 px-4 py-3 space-y-2">
                      {(tc.steps || []).map((step: any, sIdx: number) => {
                        const key = `${tcId}_step_${step.step_number}`
                        const stepState = stepsMap[key] || { status: 'pending', message: '' }

                        return (
                          <div
                            key={sIdx}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-all ${
                              stepState.status === 'running' ? 'border-amber-500/30 bg-amber-500/5' :
                              stepState.status === 'passed' ? 'border-emerald-500/20 bg-emerald-500/5' :
                              stepState.status === 'failed' ? 'border-rose-500/30 bg-rose-500/5' :
                              'border-border/50 bg-card/20'
                            }`}
                          >
                            <div className="pt-0.5 flex-shrink-0">{stepStatusIcon(stepState.status)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground font-bold">Step {step.step_number}</span>
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono text-[10px]">
                                  {step.action}
                                </span>
                                {stepState.recovery && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold flex items-center gap-0.5">
                                    <Wrench className="w-2.5 h-2.5" /> Healed
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{step.description}</p>
                              {stepState.status === 'failed' && stepState.message && (
                                <p className="text-[10px] text-rose-400 mt-1 font-medium flex items-start gap-1">
                                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{stepState.message}</span>
                                </p>
                              )}
                              {stepState.status === 'running' && stepState.message && (
                                <p className="text-[10px] text-amber-400 mt-0.5 italic">{stepState.message}</p>
                              )}
                              {stepState.screenshot && (
                                <button
                                  onClick={() => setActiveScreenshot(stepState.screenshot!)}
                                  className="mt-1.5 text-[10px] text-primary hover:underline flex items-center gap-1"
                                >
                                  <ImageIcon className="w-3 h-3" /> View Screenshot
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Right: Terminal + Screenshots ── */}
        <div className="md:col-span-3 space-y-4">
          {/* Terminal */}
          <div className="border border-border rounded-xl bg-black overflow-hidden flex flex-col h-[350px]">
            <div className="bg-neutral-900 border-b border-white/10 px-4 py-2 flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] font-mono font-bold text-muted-foreground flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                LIVE_CONSOLE
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  runStatus === 'running' ? 'bg-amber-500 animate-pulse' :
                  runStatus === 'completed' ? 'bg-emerald-500' : 'bg-border'
                }`} />
                <span className="text-[9px] font-mono text-muted-foreground uppercase">{runStatus}</span>
              </div>
            </div>
            <div className="p-4 font-mono text-xs overflow-y-auto space-y-0.5 flex-1 select-text">
              {logs.map((log, idx) => (
                <div key={idx} className={`leading-relaxed whitespace-pre-wrap break-all ${logLineColor(log)}`}>
                  {logLineText(log)}
                </div>
              ))}
              <div ref={logTerminalEndRef} />
            </div>
          </div>

          {/* Screenshots Panel */}
          <div className="border border-border rounded-xl p-4 bg-card/20 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
              Failure Screenshots
              {allScreenshots.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  {allScreenshots.length}
                </span>
              )}
            </h3>
            {allScreenshots.length === 0 ? (
              <div className="border border-dashed border-border/60 rounded-lg py-8 text-center text-xs text-muted-foreground">
                No failure screenshots yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {allScreenshots.map(({ key, url, message }) => {
                  const backendBase = process.env.NEXT_PUBLIC_API_URL
                    ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '')
                    : 'http://localhost:5000'
                  const fullUrl = `${backendBase}${url}`
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveScreenshot(fullUrl)}
                      className="border border-border bg-card rounded-lg overflow-hidden group hover:border-rose-500/40 transition-colors text-left"
                    >
                      <div className="aspect-video relative bg-neutral-950">
                        <img src={fullUrl} alt="Failure" className="object-cover w-full h-full group-hover:opacity-90 transition-opacity" />
                      </div>
                      <div className="p-2 border-t border-border bg-muted/30 text-[9px] font-mono text-muted-foreground truncate">
                        {message}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Screenshot Lightbox ── */}
      {activeScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setActiveScreenshot(null)}
        >
          <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setActiveScreenshot(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-mono"
            >
              [ESC] Close
            </button>
            <img
              src={activeScreenshot}
              alt="Screenshot"
              className="w-full rounded-xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
