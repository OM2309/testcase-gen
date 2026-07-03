'use client'

import React from 'react'
import { ChevronDown, ChevronRight, ImageIcon } from 'lucide-react'
import { TestCaseResult } from '../../types'
import { ExecutionStatusBadge } from './execution-status-badge'
import { ExecutionStepList } from './execution-step-list'
import { formatDuration } from './execution-utils'
import { Progress } from '../ui/progress'

interface ExecutionTestCaseCardProps {
  testCase: TestCaseResult
  expanded: boolean
  onToggle: () => void
}

export function ExecutionTestCaseCard({ testCase, expanded, onToggle }: ExecutionTestCaseCardProps) {
  const total = testCase.stepResults.length
  const done = testCase.stepResults.filter(s => s.status === 'passed' || s.status === 'failed').length
  const isRunning = testCase.status === 'running'
  const isFailed = testCase.status === 'failed'

  const borderAccent = isFailed
    ? 'border-rose-500/30'
    : isRunning
      ? 'border-blue-500/40'
      : 'border-border'

  return (
    <div className={`rounded-xl border ${borderAccent} bg-card overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="mt-0.5 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-primary">{testCase.testCaseId}</span>
            <ExecutionStatusBadge status={testCase.status} />
          </div>
          <p className="text-xs font-semibold text-foreground mt-1 line-clamp-2">{testCase.title}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            {testCase.module && <span>{testCase.module}</span>}
            {testCase.feature && <span>· {testCase.feature}</span>}
            <span>· {done}/{total} steps</span>
            {testCase.durationMs > 0 && <span>· {formatDuration(testCase.durationMs)}</span>}
            {testCase.screenshotPath && (
              <span className="inline-flex items-center gap-0.5 text-amber-500">
                <ImageIcon className="w-3 h-3" /> screenshot
              </span>
            )}
          </div>

          {/* mini step progress bar */}
          <Progress
            className="mt-2 h-1"
            value={total ? (done / total) * 100 : 0}
            indicatorClassName={isFailed ? 'bg-rose-500' : isRunning ? 'bg-blue-500' : 'bg-emerald-500'}
          />

          {isFailed && testCase.errorMessage && (
            <p className="mt-2 text-[11px] text-rose-500 line-clamp-2">
              Step {testCase.failedStepNumber}: {testCase.errorMessage}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/60 bg-background/40">
          <ExecutionStepList steps={testCase.stepResults} />
        </div>
      )}
    </div>
  )
}
