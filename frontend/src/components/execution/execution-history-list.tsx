'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlayCircle,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  FileDown,
  StopCircle,
  RefreshCw,
  Eye,
  Send,
  Loader2
} from 'lucide-react'
import { TestRun } from '../../types'
import { getAssetUrl } from '../../services/executionService'
import { downloadPdfReport } from '../../utils/pdfGenerator'
import { useExecutionHistoryQuery } from '../../queries/execution.query'
import { useCancelExecutionMutation } from '../../mutations/execution.mutation'
import { PageLoader, PageError } from '../shared'
import { slackService } from '../../services/slackService'
import { toast } from 'sonner'
import { SlackShareModal } from './slack-share-modal'

interface ExecutionHistoryListProps {
  projectId: string
  onSelectRun: (runId: string) => void
}

function StopHistoryButton({ runId }: { runId: string }) {
  const cancelMutation = useCancelExecutionMutation()

  return (
    <button
      onClick={() => cancelMutation.mutate(runId)}
      disabled={cancelMutation.isPending}
      className="btn-secondary"
      title="Stop execution run"
    >
      <StopCircle className={`w-4 h-4 ${cancelMutation.isPending ? 'animate-pulse' : ''}`} />
      {cancelMutation.isPending ? 'Stopping...' : 'Stop'}
    </button>
  )
}

/**
 * List of past test execution runs and generated reports with filterable details.
 */
export function ExecutionHistoryList({ projectId, onSelectRun }: ExecutionHistoryListProps) {
  const router = useRouter()
  const { data: runs = [], isLoading: loading, isError, refetch } = useExecutionHistoryQuery(projectId)
  const [expandedReportIds, setExpandedReportIds] = useState<Record<string, boolean>>({})
  const [selectedRunForShare, setSelectedRunForShare] = useState<TestRun | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [checkingSlack, setCheckingSlack] = useState<string | null>(null) // holds runId being checked

  const toggleReport = (runId: string) => {
    setExpandedReportIds((prev) => ({ ...prev, [runId]: !prev[runId] }))
  }

  const handleSlackShare = async (runItem: TestRun) => {
    setCheckingSlack(runItem._id)
    try {
      const statusRes = await slackService.getStatus()
      if (statusRes.success && statusRes.data.connected) {
        setSelectedRunForShare(runItem)
        setShareModalOpen(true)
      } else {
        toast.error('Slack is not connected. Redirecting to Profile page to connect Slack.')
        router.push('/dashboard/profile')
      }
    } catch (err) {
      toast.error('Failed to verify Slack status.')
    } finally {
      setCheckingSlack(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
            Completed
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted border border-border text-[10px] font-bold text-muted-foreground">
            Failed
          </span>
        )
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
            <RefreshCw className="w-2.5 h-2.5 animate-spin text-primary" /> Running
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted border border-border text-[10px] font-bold text-muted-foreground">
            Queued
          </span>
        )
    }
  }

  if (loading) {
    return <PageLoader message="Loading execution reports history…" />
  }

  if (isError) {
    return (
      <PageError
        message="Could not retrieve execution reports. Verify server connection."
        onRetry={() => refetch()}
      />
    )
  }

  if (runs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Execution History & Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View reports for Playwright automated test executions.
          </p>
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
          <p className="text-sm text-muted-foreground mt-0.5">
            Detailed reports from past automated Playwright runs.
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh History
        </button>
      </div>

      <div className="space-y-4">
        {runs.map((runItem: TestRun) => {
          const isReportExpanded = !!expandedReportIds[runItem._id]
          const runDate = new Date(runItem.startedAt || runItem.createdAt)
          const failedCases = runItem.testCaseResults.filter((tc) => tc.status === 'failed')

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
                    {isReportExpanded ? (
                      <ChevronDown className="w-5 h-5 text-primary" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
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
                      Report -{' '}
                      {runDate.toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </h3>
                  </div>
                </div>

                <div
                  className="flex items-center gap-4 flex-wrap"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Summary Bar */}
                  <div className="flex items-center gap-3 text-xs bg-muted/20 border border-border/40 px-3.5 py-1.5 rounded-xl font-medium">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      Total: <span className="text-foreground font-bold">{runItem.totalTests}</span>
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-border" />
                    <span className="flex items-center gap-1 text-primary">
                      Passed: <span className="font-bold">{runItem.passedTests}</span>
                    </span>
                    {runItem.failedTests > 0 && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-border" />
                        <span className="flex items-center gap-1 text-muted-foreground font-bold">
                          Failed: {runItem.failedTests}
                        </span>
                      </>
                    )}
                  </div>

                  {(runItem.status === 'running' || runItem.status === 'queued') && (
                    <StopHistoryButton runId={runItem._id} />
                  )}

                  <button
                    onClick={() => downloadPdfReport(runItem)}
                    disabled={runItem.status === 'running' || runItem.status === 'queued'}
                    className="btn-secondary"
                    title="Download PDF report"
                  >
                    <FileDown className="w-4 h-4 text-primary" /> PDF Report
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSlackShare(runItem)
                    }}
                    disabled={checkingSlack === runItem._id || runItem.status === 'running' || runItem.status === 'queued'}
                    className="btn-secondary"
                    title="Share report on Slack"
                  >
                    {checkingSlack === runItem._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-[#4A154B]" />
                    )}
                    Share
                  </button>

                  <button onClick={() => onSelectRun(runItem._id)} className="btn-primary">
                    <Eye className="w-4 h-4" /> Full Logs
                  </button>
                </div>
              </div>

              {/* Collapsed Detailed Failure Report */}
              {isReportExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-border/40 bg-muted/5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                        Project Name
                      </span>
                      <span className="text-xs font-semibold text-foreground block">
                        {runItem.projectName || 'Default Project'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                        Target Base URL
                      </span>
                      <a
                        href={runItem.runConfig.baseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary hover:underline block truncate"
                      >
                        {runItem.runConfig.baseUrl}
                      </a>
                    </div>
                  </div>

                  {failedCases.length === 0 ? (
                    <div className="border border-primary/20 bg-primary/5 p-4 rounded-xl flex items-center gap-3 text-xs text-primary">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-primary" />
                      <div>
                        <span className="font-bold block">100% Success Rate!</span>
                        All automated Playwright tests passed smoothly on this execution run.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-muted-foreground" /> Failure Details (
                        {failedCases.length} Test Cases Failed)
                      </span>
                      <div className="grid grid-cols-1 gap-3">
                        {failedCases.map((tc, idx) => (
                          <div
                            key={idx}
                            className="border border-border bg-muted/40 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4"
                          >
                            <div className="space-y-2 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded border border-border">
                                  {tc.testCaseId}
                                </span>
                                <h4 className="text-xs font-bold text-foreground truncate">
                                  {tc.title}
                                </h4>
                              </div>

                              <div className="space-y-1 pl-1 text-[11px]">
                                <p className="text-muted-foreground font-semibold">
                                  ❌ Failed on{' '}
                                  <span className="text-muted-foreground font-bold">
                                    Step {tc.failedStepNumber}
                                  </span>
                                  :
                                </p>
                                <p className="text-xs text-muted-foreground font-mono leading-relaxed bg-muted/20 border border-border p-2.5 rounded-lg whitespace-pre-wrap">
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
                                    <span className="text-[10px] text-white font-bold bg-primary px-1.5 py-0.5 rounded">
                                      View Screenshot
                                    </span>
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

      {selectedRunForShare && (
        <SlackShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          run={selectedRunForShare}
        />
      )}
    </div>
  )
}
