'use client'

import React from 'react'
import { StepResult } from '../../types'
import { getStatusStyle } from './execution-status-badge'
import { formatDuration } from './execution-utils'

export function ExecutionStepList({ steps }: { steps: StepResult[] }) {
  if (!steps || steps.length === 0) {
    return <div className="text-xs text-muted-foreground py-4 text-center">No steps.</div>
  }

  return (
    <div className="divide-y divide-border/60">
      {steps.map((step) => {
        const style = getStatusStyle(step.status)
        const isFailed = step.status === 'failed'
        const isRunning = step.status === 'running'
        return (
          <div
            key={step.stepNumber}
            className={`flex items-start gap-3 px-3 py-2.5 ${isRunning ? 'bg-primary/5' : ''} ${isFailed ? 'bg-muted/40' : ''}`}
          >
            <span className={`mt-0.5 ${style.className.split(' ').find(c => c.startsWith('text-')) || ''}`}>
              {style.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-muted-foreground">STEP {step.stepNumber}</span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-primary/10 text-primary border border-primary/20">
                  {step.action}
                </span>
                {step.target && (
                  <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[180px]">
                    {step.target}
                  </span>
                )}
                {step.value && (
                  <span className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[160px]">
                    = {step.value}
                  </span>
                )}
              </div>
              {isFailed && step.errorMessage && (
                <p className="mt-1 text-[11px] text-muted-foreground bg-muted/20 border border-border rounded px-2 py-1 font-mono break-words">
                  {step.errorMessage}
                </p>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0 mt-0.5">
              {formatDuration(step.durationMs)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
