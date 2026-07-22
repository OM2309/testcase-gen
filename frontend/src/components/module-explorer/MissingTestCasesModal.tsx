'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Info,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { GapFillData, SuggestedTestCase, GapFillItem } from '../../types'

interface MissingTestCasesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  gapFillData: GapFillData | null
  isLoading: boolean
  onAddSelectedTestCases: (selectedCases: SuggestedTestCase[]) => Promise<void>
  onReRunGapFill?: () => void
}

export function MissingTestCasesModal({
  open,
  onOpenChange,
  gapFillData,
  isLoading,
  onAddSelectedTestCases,
  onReRunGapFill,
}: MissingTestCasesModalProps) {
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set())
  const [expandedCaseIds, setExpandedCaseIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Collect all suggested test cases across all filled gaps
  const allSuggestedTestCases = useMemo(() => {
    if (!gapFillData || !Array.isArray(gapFillData.filled_gaps)) return []
    return gapFillData.filled_gaps.flatMap((g) => g.suggested_test_cases || [])
  }, [gapFillData])

  // Select all test cases by default when gapFillData loads
  useEffect(() => {
    if (allSuggestedTestCases.length > 0) {
      setSelectedCaseIds(new Set(allSuggestedTestCases.map((tc) => tc.id)))
    } else {
      setSelectedCaseIds(new Set())
    }
  }, [allSuggestedTestCases])

  const toggleSelectCase = (id: string) => {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedCaseIds.size === allSuggestedTestCases.length) {
      setSelectedCaseIds(new Set())
    } else {
      setSelectedCaseIds(new Set(allSuggestedTestCases.map((tc) => tc.id)))
    }
  }

  const toggleExpandCase = (id: string) => {
    setExpandedCaseIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAddSelected = async () => {
    const selectedCases = allSuggestedTestCases.filter((tc) => selectedCaseIds.has(tc.id))
    if (selectedCases.length === 0) return
    try {
      setIsSubmitting(true)
      await onAddSelectedTestCases(selectedCases)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-foreground">
                  AI Missing Test Cases (Agent 3 Gap Fill)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Review AI-inferred requirements and select missing test cases to add to your suite.
                </DialogDescription>
              </div>
            </div>
            {onReRunGapFill && !isLoading && (
              <button
                onClick={onReRunGapFill}
                className="btn-secondary text-[11px] h-8 px-3 cursor-pointer"
              >
                Re-analyze Gaps
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
              <div className="space-y-1">
                <p className="font-bold text-foreground text-sm">Agent 3 Analyzing Missing Details…</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Reading document gaps and generating tailored AI test scenarios to fill requirement missing details.
                </p>
              </div>
            </div>
          ) : !gapFillData || !gapFillData.filled_gaps || gapFillData.filled_gaps.length === 0 ? (
            <div className="py-12 border border-dashed border-border rounded-2xl text-center space-y-3">
              <Info className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-semibold text-foreground">No missing test cases generated yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Run Agent 3 Gap Fill analysis to discover missing functional details and generate missing test cases.
              </p>
              {onReRunGapFill && (
                <button onClick={onReRunGapFill} className="btn-primary text-xs h-9 px-4 mt-2 cursor-pointer">
                  <Sparkles className="w-4 h-4" /> Run Gap Fill Analysis
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer select-none"
                >
                  {selectedCaseIds.size === allSuggestedTestCases.length &&
                  allSuggestedTestCases.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground" />
                  )}
                  Select All ({allSuggestedTestCases.length} Suggested Test Cases)
                </button>
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedCaseIds.size} of {allSuggestedTestCases.length} selected
                </span>
              </div>

              {/* Gaps List */}
              <div className="space-y-5">
                {gapFillData.filled_gaps.map((gap: GapFillItem, gIdx: number) => {
                  const testCases = gap.suggested_test_cases || []
                  if (testCases.length === 0) return null

                  return (
                    <div
                      key={gap.id || gIdx}
                      className="border border-border bg-card/20 rounded-2xl p-4 space-y-3"
                    >
                      {/* Gap Header */}
                      <div className="space-y-1.5 pb-3 border-b border-border/40">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`text-[9px] font-bold uppercase ${
                              gap.category === 'missing_detail'
                                ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
                                : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
                            }`}
                          >
                            {gap.category === 'missing_detail' ? 'Missing Detail' : 'Ambiguity'}
                          </Badge>
                          <span className="text-xs font-bold text-foreground">
                            {gap.original_issue}
                          </span>
                        </div>
                        {gap.ai_filled_detail && (
                          <div className="bg-primary/5 border border-primary/15 rounded-xl p-2.5 text-xs text-muted-foreground flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-foreground font-semibold">AI Inferred Detail: </strong>
                              {gap.ai_filled_detail}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Suggested Test Cases List */}
                      <div className="space-y-2">
                        {testCases.map((tc: SuggestedTestCase, tcIdx: number) => {
                          const isSelected = selectedCaseIds.has(tc.id)
                          const isExpanded = expandedCaseIds.has(tc.id)

                          return (
                            <div
                              key={tc.id || tcIdx}
                              className={`border rounded-xl transition-all ${
                                isSelected
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'border-border/60 bg-background/50 hover:bg-card/50'
                              }`}
                            >
                              <div className="p-3 flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleSelectCase(tc.id)}
                                    className="mt-0.5 cursor-pointer text-primary hover:opacity-80 transition-opacity"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 text-primary" />
                                    ) : (
                                      <Square className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </button>
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-foreground capitalize">
                                        {tc.title}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] font-mono px-1.5 py-0"
                                      >
                                        {tc.module || 'General'} / {tc.feature || 'Gap Fill'}
                                      </Badge>
                                      {tc.priority && (
                                        <Badge
                                          variant="secondary"
                                          className={`text-[9px] font-bold ${
                                            tc.priority.toLowerCase() === 'high'
                                              ? 'bg-red-500/10 text-red-600'
                                              : 'bg-muted text-muted-foreground'
                                          }`}
                                        >
                                          {tc.priority}
                                        </Badge>
                                      )}
                                    </div>
                                    {tc.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {tc.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleExpandCase(tc.id)}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>

                              {/* Expanded Steps & Details */}
                              {isExpanded && (
                                <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-2 text-xs">
                                  {tc.expected_result && (
                                    <div>
                                      <span className="font-bold text-foreground">Expected Result: </span>
                                      <span className="text-muted-foreground">{tc.expected_result}</span>
                                    </div>
                                  )}
                                  {tc.steps && tc.steps.length > 0 && (
                                    <div className="space-y-1">
                                      <span className="font-bold text-foreground block">Steps:</span>
                                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground font-mono text-[11px]">
                                        {tc.steps.map((step, sIdx) => (
                                          <li key={sIdx}>
                                            <span className="font-semibold text-foreground">
                                              {step.action}
                                            </span>{' '}
                                            {step.target && <span>target: {step.target}</span>}{' '}
                                            {step.expected && <span>({step.expected})</span>}
                                          </li>
                                        ))}
                                      </ol>
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
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 px-6 border-t border-border bg-muted/20 flex items-center justify-between">
          <button onClick={() => onOpenChange(false)} className="btn-secondary text-xs">
            Cancel
          </button>
          <button
            onClick={handleAddSelected}
            disabled={selectedCaseIds.size === 0 || isSubmitting || isLoading}
            className="btn-primary text-xs h-9 px-4 cursor-pointer inline-flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add {selectedCaseIds.size} Selected Test Cases
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
