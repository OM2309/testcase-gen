'use client'

import React, { useState, useMemo } from 'react'
import { PlayCircle, Loader2, AlertTriangle } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useExecutionSocket } from '../hooks/useExecutionSocket'
import { executionService } from '../services/executionService'
import { TestCaseResult } from '../types'
import { ExecutionHeader } from './execution/execution-header'
import { ExecutionSummaryCards } from './execution/execution-summary-cards'
import { ExecutionTestCaseList } from './execution/execution-testcase-list'
import { ExecutionConsole } from './execution/execution-console'
import { ExecutionScreenshotPanel } from './execution/execution-screenshot-panel'

export function ExecutionView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const runId = searchParams.get('runId')

  const { run, loading, error, refetch } = useExecutionSocket(runId)
  const isPolling = !!run && run.status !== 'completed' && run.status !== 'failed'
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null)
  const [rerunning, setRerunning] = useState(false)

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
        router.push(`/dashboard/${run.projectId}/execution?runId=${res.runId}`)
      }
    } catch (err) {
      console.error('Re-run failed', err)
    } finally {
      setRerunning(false)
    }
  }

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
        onRerun={handleRerun}
        rerunning={rerunning}
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
