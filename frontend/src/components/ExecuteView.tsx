'use client'

import React, { useState, useEffect, useRef } from 'react'
import { executionService } from '../services/executionService'
import { Terminal, ShieldAlert, CheckCircle, RefreshCcw, Loader, Image as ImageIcon, Check } from 'lucide-react'

interface ExecuteViewProps {
  runId: string
  testCases: any[]
}

export function ExecuteView({ runId, testCases = [] }: ExecuteViewProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [runStatus, setRunStatus] = useState<'pending' | 'running' | 'completed' | 'failed'>('pending')
  const [stepsMap, setStepsMap] = useState<Record<string, { status: 'pending' | 'running' | 'passed' | 'failed'; message: string; screenshot?: string; recovery?: any }>>({})
  const [summary, setSummary] = useState({ total: testCases.length, passed: 0, failed: 0, skipped: 0 })
  const logTerminalEndRef = useRef<HTMLDivElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const initialMap: typeof stepsMap = {}
    testCases.forEach(tc => {
      tc.steps?.forEach((step: any) => {
        const key = `${tc.id || tc._id}_step_${step.step_number}`
        initialMap[key] = { status: 'pending', message: 'Awaiting execution' }
      })
    })
    setStepsMap(initialMap)

    setLogs(['[SYSTEM] Initializing Playwright runner...'])

    const streamUrl = executionService.getStreamUrl(runId)
    const es = new EventSource(streamUrl)
    eventSourceRef.current = es

    es.onopen = () => {
      setLogs(prev => [...prev, '[SSE] Connected to live runner stream.'])
    }

    es.onerror = (err) => {
      console.error('SSE Connection failed', err)
      setLogs(prev => [...prev, '[SSE] Connection lost. Reconnecting...'])
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleSSEEvent(data)
      } catch (err) {
        console.error('Failed to parse SSE event data', err)
      }
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [runId, testCases])

  useEffect(() => {
    logTerminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleSSEEvent = (event: any) => {
    const timestamp = new Date().toLocaleTimeString()
    const logPrefix = `[${timestamp}]`

    switch (event.type) {
      case 'RUN_STARTED':
        setRunStatus('running')
        setLogs(prev => [...prev, `${logPrefix} Playwright browser execution started.`])
        break

      case 'TEST_STARTED':
        setLogs(prev => [...prev, `${logPrefix} Starting TestCase: ${event.title} (${event.testCaseId})`])
        break

      case 'STEP_STARTED': {
        const key = `${event.testCaseId}_step_${event.stepNumber}`
        setStepsMap(prev => ({
          ...prev,
          [key]: { status: 'running', message: event.message }
        }))
        setLogs(prev => [...prev, `${logPrefix} Executing: [${event.action}] on target [${event.target || 'N/A'}] - ${event.message}`])
        break
      }

      case 'RECOVERY_STARTED': {
        const key = `${event.testCaseId}_step_${event.stepNumber}`
        setStepsMap(prev => ({
          ...prev,
          [key]: { ...prev[key], status: 'running', message: '⚠️ Fail detected. Agent 3 healing locator...' }
        }))
        setLogs(prev => [...prev, `${logPrefix} ⚠️ Step failed. Prompting Agent 3 Recovery...`])
        break
      }

      case 'RECOVERY_APPLIED': {
        const key = `${event.testCaseId}_step_${event.stepNumber}`
        setStepsMap(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            status: 'running',
            message: `Healed step: ${event.message}`,
            recovery: event.recovery
          }
        }))
        setLogs(prev => [...prev, `${logPrefix} 🛠️ Healed successfully! Applying: [${event.recovery?.action}] on target [${event.recovery?.target}]`])
        break
      }

      case 'STEP_PASSED': {
        const key = `${event.testCaseId}_step_${event.stepNumber}`
        setStepsMap(prev => ({
          ...prev,
          [key]: { ...prev[key], status: 'passed', message: 'Passed' }
        }))
        setLogs(prev => [...prev, `${logPrefix} ✓ Step passed.`])
        break
      }

      case 'STEP_FAILED': {
        const key = `${event.testCaseId}_step_${event.stepNumber}`
        setStepsMap(prev => ({
          ...prev,
          [key]: { ...prev[key], status: 'failed', message: event.message, screenshot: event.screenshot }
        }))
        setLogs(prev => [...prev, `${logPrefix} ❌ Step failed permanently: ${event.message}`])
        break
      }

      case 'TEST_FINISHED':
        setLogs(prev => [...prev, `${logPrefix} TestCase ${event.testCaseId} finished with status: ${event.status.toUpperCase()}`])
        break

      case 'RUN_FINISHED':
        setRunStatus('completed')
        setSummary(event.summary)
        setLogs(prev => [...prev, `${logPrefix} Run completed. Passed: ${event.summary.passed}, Failed: ${event.summary.failed}, Skipped: ${event.summary.skipped}`])
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }
        break

      default:
        break
    }
  }

  const getStepStatusStyle = (status: string) => {
    switch (status) {
      case 'running':
        return 'border-amber-500 bg-amber-500/5 text-amber-300'
      case 'passed':
        return 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400'
      case 'failed':
        return 'border-rose-500/40 bg-rose-500/5 text-rose-400'
      default:
        return 'border-border bg-card/40 text-muted-foreground'
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-border bg-card rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Real-Time Execution Monitor</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Playwright headless browser execution stream with Agent 3 locator self-healing.</p>
        </div>

        <div className="flex items-center gap-6 text-center">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Tests</span>
            <div className="text-lg font-bold">{summary.total}</div>
          </div>
          <div className="space-y-1 border-l border-border pl-6">
            <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Passed</span>
            <div className="text-lg font-bold text-emerald-400">{summary.passed}</div>
          </div>
          <div className="space-y-1 border-l border-border pl-6">
            <span className="text-[10px] text-rose-400 uppercase font-bold tracking-wider">Failed</span>
            <div className="text-lg font-bold text-rose-400">{summary.failed}</div>
          </div>
          <div className="space-y-1 border-l border-border pl-6">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Skipped</span>
            <div className="text-lg font-bold text-muted-foreground">{summary.skipped}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-2 border border-border rounded-xl p-5 bg-card/10 space-y-4 max-h-[600px] overflow-y-auto">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Test Suite Steps Flow</h3>
          <div className="space-y-3">
            {testCases.map((tc, tcIdx) => (
              <div key={tc.id || tcIdx} className="space-y-2 border-b border-border/40 pb-3 last:border-b-0 last:pb-0">
                <span className="text-[10px] font-mono text-primary font-semibold">{tc.id || `TC-${tcIdx + 1}`} • {tc.title}</span>
                <div className="space-y-1.5 pl-1">
                  {tc.steps?.map((step: any, sIdx: number) => {
                    const key = `${tc.id || tc._id}_step_${step.step_number}`
                    const stepState = stepsMap[key] || { status: 'pending', message: 'Awaiting execution' }

                    return (
                      <div
                        key={sIdx}
                        className={`border rounded-lg p-2.5 flex items-center justify-between text-xs transition-all ${getStepStatusStyle(stepState.status)}`}
                      >
                        <div className="space-y-0.5 pr-4">
                          <div className="font-semibold flex items-center gap-1.5">
                            <span>Step {step.step_number}:</span>
                            <span className="font-mono bg-border/45 px-1 py-0.2 rounded text-[10px]">{step.action}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{step.description}</p>
                          {stepState.status === 'running' && (
                            <p className="text-[10px] text-amber-400 font-medium italic mt-0.5">{stepState.message}</p>
                          )}
                          {stepState.recovery && (
                            <span className="inline-block mt-1 text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">Self-Healed Locator</span>
                          )}
                        </div>

                        <div className="flex-shrink-0">
                          {stepState.status === 'running' && <Loader className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                          {stepState.status === 'passed' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                          {stepState.status === 'failed' && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
                          {stepState.status === 'pending' && <div className="w-3.5 h-3.5 rounded-full border border-border" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="border border-border rounded-xl bg-black overflow-hidden flex flex-col h-[350px]">
            <div className="bg-neutral-900 border-b border-border/80 px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-muted-foreground flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-primary" /> TEST_RUNNER_CONSOLE</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${runStatus === 'running' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[9px] font-mono text-muted-foreground uppercase">{runStatus}</span>
              </span>
            </div>
            <div className="p-4 font-mono text-xs text-emerald-400/90 overflow-y-auto space-y-1.5 flex-1 select-text">
              {logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed break-all whitespace-pre-wrap">{log}</div>
              ))}
              <div ref={logTerminalEndRef} />
            </div>
          </div>

          <div className="border border-border rounded-xl p-5 bg-card/25 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><ImageIcon className="w-4 h-4 text-primary" /> Failed Step Screenshots</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(stepsMap)
                .filter(([_, value]) => value.screenshot)
                .map(([key, value]) => {
                  const stepNum = key.split('_step_')[1]
                  const backendBase = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5000'
                  const screenshotUrl = `${backendBase}${value.screenshot}`

                  return (
                    <div key={key} className="border border-border bg-card rounded-lg overflow-hidden flex flex-col justify-between group cursor-zoom-in">
                      <div className="aspect-video relative bg-neutral-950 flex items-center justify-center">
                        <img
                          src={screenshotUrl}
                          alt={`Failure Screenshot Step ${stepNum}`}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2 border-t border-border bg-muted/40 text-[9px] font-mono text-muted-foreground flex justify-between items-center">
                        <span>Step {stepNum} fail</span>
                        <a href={screenshotUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline uppercase">Full size</a>
                      </div>
                    </div>
                  )
                })}
              {Object.values(stepsMap).filter(v => v.screenshot).length === 0 && (
                <div className="col-span-full border border-dashed border-border/80 rounded-lg py-12 text-center text-xs text-muted-foreground">
                  No screenshots captured yet. (Screenshots are only captured upon test failure).
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
