'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  PlayCircle, Loader2, AlertTriangle, Clock, ShieldAlert,
  ChevronDown, ChevronRight, FileText, CheckCircle2, XCircle, Eye, FileDown, StopCircle
} from 'lucide-react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { useExecutionSocket } from '../hooks/useExecutionSocket'
import { executionService, getAssetUrl } from '../services/executionService'
import { TestCaseResult, TestRun } from '../types'
import { downloadPdfReport } from '../utils/pdfGenerator'
import { ExecutionHeader } from './execution/execution-header'
import { ExecutionSummaryCards } from './execution/execution-summary-cards'
import { ExecutionTestCaseList } from './execution/execution-testcase-list'
import { ExecutionConsole } from './execution/execution-console'
import { ExecutionScreenshotPanel } from './execution/execution-screenshot-panel'

export function ExecutionView() {
  const router = useRouter()
  const params = useParams() as { projectId?: string }
  const projectId = params.projectId
  const searchParams = useSearchParams()
  const runId = searchParams.get('runId')

  const { run, loading: socketLoading, error: socketError, refetch } = useExecutionSocket(runId)
  const isPolling = !!run && run.status !== 'completed' && run.status !== 'failed'
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState(false)

  // Selected test case for live detail pane
  const selectedTestCase: TestCaseResult | null = useMemo(() => {
    if (!run) return null
    if (selectedTestCaseId) {
      return run.testCaseResults.find(tc => tc.testCaseId === selectedTestCaseId) || null
    }
    return run.testCaseResults.find(tc => tc.status === 'failed') || null
  }, [run, selectedTestCaseId])

  const handleRerun = async () => {
    if (!run) return
    try {
      setRerunning(true)
      const res = await executionService.startExecution({
        projectId: run.projectId,
        testSuiteId: run.testSuiteId,
        baseUrl: run.runConfig.baseUrl,
        headless: run.runConfig.headless
      })
      if (res.success) {
        setSelectedTestCaseId(null)
        router.push(`/dashboard/${run.projectId}/execution?runId=${res.data.runId}`)
      }
    } catch (err) {
      console.error('Re-run failed', err)
    } finally {
      setRerunning(false)
    }
  }

  const [cancelling, setCancelling] = useState(false)

  const handleCancel = async () => {
    if (!runId) return
    try {
      setCancelling(true)
      const res = await executionService.cancelExecution(runId)
      if (res.success) {
        refetch()
      }
    } catch (err) {
      console.error('Cancel run failed', err)
    } finally {
      setCancelling(false)
    }
  }

  if (!runId) {
    if (!projectId) {
      return (
        <div className="text-center py-16 border border-dashed border-border bg-card/20 rounded-2xl text-xs text-muted-foreground">
          Project space not identified.
        </div>
      )
    }
    return (
      <ExecutionHistoryList
        projectId={projectId}
        onSelectRun={(id) => router.push(`/dashboard/${projectId}/execution?runId=${id}`)}
      />
    )
  }

  if (socketLoading && !run) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading execution run…</p>
      </div>
    )
  }

  if (socketError && !run) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-rose-500 gap-3">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm">{socketError}</p>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted cursor-pointer"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!run) return null

  return (
    <div className="flex flex-col gap-5">
      <ExecutionHeader
        run={run}
        isPolling={isPolling}
        onRefresh={() => refetch()}
        onRerun={handleRerun}
        rerunning={rerunning}
        onCancel={handleCancel}
        cancelling={cancelling}
      />

      <ExecutionSummaryCards run={run} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          <ExecutionTestCaseList
            testCases={run.testCaseResults}
            currentTestCaseId={run.currentTestCaseId}
            selectedTestCaseId={selectedTestCaseId}
            onSelectTestCase={setSelectedTestCaseId}
          />
        </div>

        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-4">
          <ExecutionConsole logs={run.executionLogs} isPolling={isPolling} />
          <ExecutionScreenshotPanel testCase={selectedTestCase} />
        </div>
      </div>
    </div>
  )
}

function StopHistoryButton({ runId, onCancelled }: { runId: string; onCancelled: () => void }) {
  const [cancelling, setCancelling] = useState(false)
  
  const handleStop = async () => {
    try {
      setCancelling(true)
      await executionService.cancelExecution(runId)
      onCancelled()
    } catch (err) {
      console.error("Failed to stop run from list", err)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <button
      onClick={handleStop}
      disabled={cancelling}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-500 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      title="Stop execution run"
    >
      <StopCircle className={`w-4 h-4 ${cancelling ? 'animate-pulse' : ''}`} />
      {cancelling ? 'Stopping...' : 'Stop'}
    </button>
  )
}

/* --- Subcomponent: Execution History & Report list --- */
interface ExecutionHistoryListProps {
  projectId: string
  onSelectRun: (runId: string) => void
}

function ExecutionHistoryList({ projectId, onSelectRun }: ExecutionHistoryListProps) {
  const [runs, setRuns] = useState<TestRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedReportIds, setExpandedReportIds] = useState<Record<string, boolean>>({})

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await executionService.getProjectExecutions(projectId)
      if (res.success) {
        setRuns(res.data || [])
      }
    } catch (err: any) {
      console.error('Failed to load executions history:', err)
      setError('Could not retrieve execution reports. Verify server connection.')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const toggleReport = (runId: string) => {
    setExpandedReportIds(prev => ({ ...prev, [runId]: !prev[runId] }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">Completed</span>
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400">Failed</span>
      case 'running':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400"><Loader2 className="w-2.5 h-2.5 animate-spin" /> Running</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400">Queued</span>
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading execution reports history…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-rose-500 gap-3">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchHistory}
          className="px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted cursor-pointer"
        >
          Retry
        </button>
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Execution History & Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">View reports for Playwright automated test executions.</p>
        </div>
        <div className="border border-dashed border-border rounded-2xl bg-card/10 flex flex-col items-center justify-center p-16 text-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <PlayCircle className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className="font-semibold text-lg">No Executions Found</h3>
            <p className="text-sm text-muted-foreground">
              You haven't run any test suites for this project yet. Head over to the Modules page to launch a suite execution!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Execution History & Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Detailed reports from past automated Playwright runs.</p>
        </div>
        <button
          onClick={fetchHistory}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted transition-colors cursor-pointer"
        >
          Refresh History
        </button>
      </div>

      <div className="space-y-4">
        {runs.map((runItem) => {
          const isReportExpanded = !!expandedReportIds[runItem._id]
          const runDate = new Date(runItem.startedAt || runItem.createdAt)
          const failedCases = runItem.testCaseResults.filter(tc => tc.status === 'failed')

          return (
            <div
              key={runItem._id}
              className={`border rounded-2xl bg-card/30 hover:border-border border-border/60 overflow-hidden transition-all duration-200 ${
                isReportExpanded ? 'border-primary/40 shadow-sm' : ''
              }`}
            >
              {/* Report Header Card */}
              <div
                onClick={() => toggleReport(runItem._id)}
                className="p-5 cursor-pointer select-none flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="text-muted-foreground p-0.5 flex-shrink-0">
                    {isReportExpanded ? <ChevronDown className="w-5 h-5 text-primary" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-muted-foreground flex-shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {runItem.suiteName || 'Automated Suite'}
                      </span>
                      {getStatusBadge(runItem.status)}
                    </div>
                    <h3 className="text-sm font-bold text-foreground mt-1 truncate">
                      Report - {runDate.toLocaleString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-wrap" onClick={e => e.stopPropagation()}>
                  {/* Summary Bar */}
                  <div className="flex items-center gap-3 text-xs bg-muted/20 border border-border/40 px-3.5 py-1.5 rounded-xl font-medium">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      Total: <span className="text-foreground font-bold">{runItem.totalTests}</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-border" />
                    <span className="flex items-center gap-1 text-emerald-400">
                      Passed: <span className="font-bold">{runItem.passedTests}</span>
                    </span>
                    {runItem.failedTests > 0 && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-border" />
                        <span className="flex items-center gap-1 text-rose-400 font-bold">
                          Failed: {runItem.failedTests}
                        </span>
                      </>
                    )}
                  </div>

                  {(runItem.status === 'running' || runItem.status === 'queued') && (
                    <StopHistoryButton runId={runItem._id} onCancelled={fetchHistory} />
                  )}

                  <button
                    onClick={() => downloadPdfReport(runItem)}
                    disabled={runItem.status === 'running' || runItem.status === 'queued'}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-border bg-card hover:bg-muted cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Download PDF report"
                  >
                    <FileDown className="w-4 h-4 text-primary" /> PDF Report
                  </button>

                  <button
                    onClick={() => onSelectRun(runItem._id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" /> Full Logs
                  </button>
                </div>
              </div>

              {/* Collapsed Detailed Failure Report (Interactive & Gamified) */}
              {isReportExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-border/40 bg-muted/5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Project Name</span>
                      <span className="text-xs font-semibold text-foreground block">{runItem.projectName || 'Default Project'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Target Base URL</span>
                      <a href={runItem.runConfig.baseUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline block truncate">
                        {runItem.runConfig.baseUrl}
                      </a>
                    </div>
                  </div>

                  {failedCases.length === 0 ? (
                    <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-xl flex items-center gap-3 text-xs text-emerald-400">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <span className="font-bold block">100% Success Rate!</span>
                        All automated Playwright tests passed smoothly on this execution run.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider block flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" /> Failure Details ({failedCases.length} Test Cases Failed)
                      </span>
                      <div className="grid grid-cols-1 gap-3">
                        {failedCases.map((tc, idx) => (
                          <div
                            key={idx}
                            className="border border-rose-500/20 bg-rose-500/5 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4"
                          >
                            <div className="space-y-2 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/15">
                                  {tc.testCaseId}
                                </span>
                                <h4 className="text-xs font-bold text-foreground truncate">{tc.title}</h4>
                              </div>

                              <div className="space-y-1 pl-1 text-[11px]">
                                <p className="text-muted-foreground font-semibold">
                                  ❌ Failed on <span className="text-rose-400 font-bold">Step {tc.failedStepNumber}</span>:
                                </p>
                                <p className="text-xs text-rose-400 font-mono leading-relaxed bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-lg whitespace-pre-wrap">
                                  {tc.errorMessage || 'No specific assertion message provided.'}
                                </p>
                              </div>
                            </div>

                            {tc.screenshotPath && (
                              <div className="flex-shrink-0 flex items-center justify-center">
                                <a
                                  href={getAssetUrl(tc.screenshotPath)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative group block rounded-lg overflow-hidden border border-border/80 hover:border-primary/40 cursor-pointer shadow-sm transition-all"
                                  title="Click to view full failure screenshot"
                                >
                                  <img
                                    src={getAssetUrl(tc.screenshotPath)}
                                    alt="Failure screenshot"
                                    className="w-32 h-20 object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-[10px] text-white font-bold bg-primary px-1.5 py-0.5 rounded">View Screenshot</span>
                                  </div>
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
