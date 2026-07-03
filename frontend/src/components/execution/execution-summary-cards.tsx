'use client'

import React from 'react'
import { ListChecks, CheckCircle2, XCircle, Loader2, Timer } from 'lucide-react'
import { TestRun } from '../../types'
import { elapsedBetween } from './execution-utils'

function SummaryCard({
  label, value, icon, accent
}: {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-xl font-bold tabular-nums leading-tight">{value}</div>
      </div>
    </div>
  )
}

export function ExecutionSummaryCards({ run }: { run: TestRun }) {
  const finished = run.passedTests + run.failedTests + run.skippedTests
  const runningCount = run.testCaseResults.filter(tc => tc.status === 'running').length
  const total = run.totalTests || run.testCaseResults.length || 0
  const pct = total > 0 ? Math.round((finished / total) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <SummaryCard
          label="Total"
          value={total}
          icon={<ListChecks className="w-4.5 h-4.5 text-foreground" />}
          accent="bg-muted"
        />
        <SummaryCard
          label="Passed"
          value={run.passedTests}
          icon={<CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />}
          accent="bg-emerald-500/10"
        />
        <SummaryCard
          label="Failed"
          value={run.failedTests}
          icon={<XCircle className="w-4.5 h-4.5 text-rose-500" />}
          accent="bg-rose-500/10"
        />
        <SummaryCard
          label="Running"
          value={runningCount}
          icon={<Loader2 className={`w-4.5 h-4.5 text-blue-500 ${runningCount > 0 ? 'animate-spin' : ''}`} />}
          accent="bg-blue-500/10"
        />
        <SummaryCard
          label="Duration"
          value={<span className="text-base">{elapsedBetween(run.startedAt, run.completedAt)}</span>}
          icon={<Timer className="w-4.5 h-4.5 text-amber-500" />}
          accent="bg-amber-500/10"
        />
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-semibold text-muted-foreground">Progress</span>
          <span className="font-bold tabular-nums">{finished} / {total} · {pct}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${total ? (run.passedTests / total) * 100 : 0}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${total ? (run.failedTests / total) * 100 : 0}%` }}
          />
          <div
            className="h-full bg-muted-foreground/30 transition-all duration-500"
            style={{ width: `${total ? (run.skippedTests / total) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  )
}
