'use client'

import React, { useState, useMemo } from 'react'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
import { useExecutionSocket } from '../hooks/useExecutionSocket'
import { TestCaseResult } from '../types'
import { useStartExecutionMutation, useCancelExecutionMutation } from '../mutations/execution.mutation'
import { ExecutionHeader } from './execution/execution-header'
import { ExecutionSummaryCards } from './execution/execution-summary-cards'
import { ExecutionTestCaseList } from './execution/execution-testcase-list'
import { ExecutionConsole } from './execution/execution-console'
import { ExecutionScreenshotPanel } from './execution/execution-screenshot-panel'
import { FigmaDesignMatchPanel } from './execution/FigmaDesignMatchPanel'
import { ExecutionHistoryList } from './execution/execution-history-list'
import { PageLoader, PageError, EmptyState } from '@/components/shared'
import { useProject } from '../contexts/ProjectContext'
import { PlayCircle } from 'lucide-react'

export function ExecutionView() {
  const { project } = useProject()
  const router = useRouter()
  const params = useParams() as { projectId?: string }
  const projectId = params.projectId
  const searchParams = useSearchParams()
  const runId = searchParams.get('runId')

  const { run, loading: socketLoading, error: socketError, refetch } = useExecutionSocket(runId)
  const isPolling = !!run && run.status !== 'completed' && run.status !== 'failed'
  const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null)

  const startMutation = useStartExecutionMutation()
  const cancelMutation = useCancelExecutionMutation()

  // Selected test case for live detail pane
  const selectedTestCase: TestCaseResult | null = useMemo(() => {
    if (!run) return null
    if (selectedTestCaseId) {
      return run.testCaseResults.find((tc) => tc.testCaseId === selectedTestCaseId) || null
    }
    return run.testCaseResults.find((tc) => tc.status === 'failed') || null
  }, [run, selectedTestCaseId])

  const handleRerun = () => {
    if (!run) return
    startMutation.mutate(
      {
        projectId: run.projectId,
        testSuiteId: run.testSuiteId,
        baseUrl: run.runConfig.baseUrl,
        headless: run.runConfig.headless,
      },
      {
        onSuccess: (res) => {
          if (res.success) {
            setSelectedTestCaseId(null)
            router.push(`/dashboard/${run.projectId}/execution?runId=${res.data.runId}`)
          }
        },
      }
    )
  }

  const handleCancel = () => {
    if (!runId) return
    cancelMutation.mutate(runId, {
      onSuccess: () => refetch(),
    })
  }

  if (!runId) {
    if (!projectId) {
      return <EmptyState icon={PlayCircle} title="Project space not identified." />
    }
    return (
      <ExecutionHistoryList
        projectId={projectId}
        onSelectRun={(id) => router.push(`/dashboard/${projectId}/execution?runId=${id}`)}
      />
    )
  }

  if (socketLoading && !run) {
    return <PageLoader message="Loading execution run…" />
  }

  if (socketError && !run) {
    return <PageError message={socketError} onRetry={() => refetch()} />
  }

  if (!run) return null

  return (
    <div className="flex flex-col gap-5">
      <ExecutionHeader
        run={run}
        isPolling={isPolling}
        onRefresh={() => refetch()}
        onRerun={handleRerun}
        rerunning={startMutation.isPending}
        onCancel={handleCancel}
        cancelling={cancelMutation.isPending}
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
          {selectedTestCase?.figmaFrameId ? (
            <FigmaDesignMatchPanel testCase={selectedTestCase} frames={project?.figmaSyncedFrames || []} />
          ) : (
            <ExecutionScreenshotPanel testCase={selectedTestCase} />
          )}
        </div>
      </div>
    </div>
  )
}
