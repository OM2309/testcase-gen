'use client'

import React, { useState, useMemo } from 'react'
import { PlayCircle, Loader2, AlertTriangle } from 'lucide-react'
import { useExecutionRunQuery } from '../hooks/queries'
import { executionService } from '../services/executionService'
import { TestCaseResult } from '../types'
import { ExecutionHeader } from './execution/execution-header'
import { ExecutionSummaryCards } from './execution/execution-summary-cards'
import { ExecutionTestCaseList } from './execution/execution-testcase-list'
import { ExecutionConsole } from './execution/execution-console'
import { ExecutionScreenshotPanel } from './execution/execution-screenshot-panel'

interface ExecutionViewProps {
  runId: string | null
  /** Called when a re-run is started so the parent can swap to the new runId. */
  onRunStarted?: (runId: string) => void
}

export function ExecutionView({ runId, onRunStarted }: ExecutionViewProps) {
  const query = useExecutionRunQuery(runId)
  const run = query.data ?? null
  const loading = query.isLoading
  const error = query.error ? (query.error as Error).message : null
  const isPolling = !!run && run.status !== 'completed' && run.status !== 'failed'
  const refetch = query.refetch
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState(false)

  // Derive the displayed test case: the user's explicit selection, otherwise
  // fall back to the first failed test case (most useful) once data arrives.
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
      if (res.success && onRunStarted) {
        setSelectedTestCaseId(null)
        onRunStarted(res.runId)
      }
    } catch (err) {
      console.error('Re-run failed', err)
    } finally {
      setRerunning(false)
    }
  }

  /* -------- Empty / loading / error states -------- */

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-3">
        <PlayCircle className="w-10 h-10 opacity-30" />
        <p className="text-sm">No active execution. Run a test suite to see live results here.</p>
      </div>
    )
  }

  if (loading && !run) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Loading execution run…</p>
      </div>
    )
  }

  if (error && !run) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-rose-500 gap-3">
        <AlertTriangle className="w-8 h-8" />
        <p className="text-sm">{error}</p>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted"
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
        onRerun={onRunStarted ? handleRerun : undefined}
        rerunning={rerunning}
      />

      <ExecutionSummaryCards run={run} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left — test case list */}
        <div className="lg:col-span-7">
          <ExecutionTestCaseList
            testCases={run.testCaseResults}
            currentTestCaseId={run.currentTestCaseId}
            selectedTestCaseId={selectedTestCaseId}
            onSelectTestCase={setSelectedTestCaseId}
          />
        </div>

        {/* Right — console + screenshot */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-4">
          <ExecutionConsole logs={run.executionLogs} isPolling={isPolling} />
          <ExecutionScreenshotPanel testCase={selectedTestCase} />
        </div>
      </div>
    </div>
  )
}
