'use client'

import React, { useState, useEffect } from 'react'
import { ListChecks } from 'lucide-react'
import { TestCaseResult } from '../../types'
import { ExecutionTestCaseCard } from './execution-testcase-card'

interface ExecutionTestCaseListProps {
  testCases: TestCaseResult[]
  currentTestCaseId?: string
  selectedTestCaseId: string | null
  onSelectTestCase: (id: string) => void
}

export function ExecutionTestCaseList({
  testCases,
  currentTestCaseId,
  selectedTestCaseId,
  onSelectTestCase
}: ExecutionTestCaseListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Auto-expand the test case that is currently running so the user can watch it live.
  useEffect(() => {
    if (currentTestCaseId) {
      setExpanded(prev => {
        if (prev.has(currentTestCaseId)) return prev
        const next = new Set(prev)
        next.add(currentTestCaseId)
        return next
      })
    }
  }, [currentTestCaseId])

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    onSelectTestCase(id)
  }

  if (!testCases || testCases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
        No test cases in this run.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
        <ListChecks className="w-3.5 h-3.5 text-primary" /> Test Cases ({testCases.length})
      </h3>
      <div className="space-y-2">
        {testCases.map((tc) => (
          <div
            key={tc.testCaseId}
            className={selectedTestCaseId === tc.testCaseId ? 'ring-1 ring-primary/40 rounded-xl' : ''}
          >
            <ExecutionTestCaseCard
              testCase={tc}
              expanded={expanded.has(tc.testCaseId)}
              onToggle={() => toggle(tc.testCaseId)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
