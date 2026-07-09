'use client'

import React from 'react'
import { ShieldCheck, Layers, ListChecks, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TestCase } from '../../types'

/** Top-of-suite stats: test cases, steps, modules, scenario + priority breakdown. */
export function SuiteSummary({ testCases }: { testCases: TestCase[] }) {
  const regressiveCount = testCases.filter(tc => tc.isRegressive).length
  const moduleCount = new Set(testCases.map(tc => tc.module || 'General')).size
  const priorityCounts = testCases.reduce((acc, tc) => {
    const key = (tc.priority || '').toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const negativeCount = testCases.filter(tc => (tc.scenario_type || '').toLowerCase() === 'negative').length
  const positiveCount = testCases.length - negativeCount

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="flex-row items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4.5 h-4.5 text-[#FF6B00]" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Test Cases</div>
            <div className="text-xl font-bold tabular-nums leading-tight">{testCases.length}</div>
          </div>
        </Card>
        <Card className="flex-row items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <RotateCcw className="w-4.5 h-4.5 text-blue-500" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Regressive</div>
            <div className="text-xl font-bold tabular-nums leading-tight">{regressiveCount}</div>
          </div>
        </Card>
        <Card className="flex-row items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
            <Layers className="w-4.5 h-4.5 text-violet-500" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Modules</div>
            <div className="text-xl font-bold tabular-nums leading-tight">{moduleCount}</div>
          </div>
        </Card>
        <Card className="flex-row items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <ListChecks className="w-4.5 h-4.5 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Scenarios</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">{positiveCount} pos</Badge>
              <Badge variant="outline" className="text-rose-500 border-rose-500/30">{negativeCount} neg</Badge>
            </div>
          </div>
        </Card>
      </div>

      {(priorityCounts['high'] || priorityCounts['medium'] || priorityCounts['low'] || priorityCounts['critical']) && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Priority</span>
          {priorityCounts['critical'] > 0 && <Badge variant="outline" className="text-red-500 border-red-500/30">Critical · {priorityCounts['critical']}</Badge>}
          {priorityCounts['high'] > 0 && <Badge variant="outline" className="text-rose-500 border-rose-500/30">High · {priorityCounts['high']}</Badge>}
          {priorityCounts['medium'] > 0 && <Badge variant="outline" className="text-amber-500 border-amber-500/30">Medium · {priorityCounts['medium']}</Badge>}
          {priorityCounts['low'] > 0 && <Badge variant="outline" className="text-blue-500 border-blue-500/30">Low · {priorityCounts['low']}</Badge>}
        </div>
      )}
    </>
  )
}
