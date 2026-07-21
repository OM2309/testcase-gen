'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { ModuleGroup, FeatureGroup, TestCase, TestSuiteData } from '../../types'
import { getPriorityBadge } from '../../helpers/utils'

interface ActiveModulePanelProps {
  activeMod: ModuleGroup | undefined
  selectedSrsFileName?: string
  selectedSrsId?: string | null
  selectedSuite: TestSuiteData | null
  projectId: string
  onExportExcel: (fileName: string, modules: ModuleGroup[]) => void
  onOpenRunDialog: (
    type: 'project' | 'module' | 'feature' | 'testcase' | 'srs',
    name: string,
    testCases: TestCase[],
    suiteId?: string
  ) => void
}

/**
 * Panel rendering active module features, positive/negative test case counts, and test case list drill-down.
 */
export function ActiveModulePanel({
  activeMod,
  selectedSrsFileName = '',
  selectedSrsId,
  selectedSuite,
  projectId,
  onExportExcel,
  onOpenRunDialog,
}: ActiveModulePanelProps) {
  const router = useRouter()
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({})

  if (!activeMod) {
    return <p className="text-xs text-muted-foreground italic">Select a module to view.</p>
  }

  return (
    <div className="space-y-4">
      {/* Module Header */}
      <div className="border border-border bg-card/45 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap shadow-sm">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
            Active Module
          </span>
          <h4 className="text-sm font-bold text-foreground capitalize">{activeMod.name}</h4>
          {activeMod.description && (
            <p className="text-[11px] text-muted-foreground">{activeMod.description}</p>
          )}
        </div>
        {selectedSuite && activeMod.testCasesCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExportExcel(`${selectedSrsFileName}_${activeMod.name}`, [activeMod])}
              className="btn-secondary h-8 px-3 text-xs"
            >
              Export Module Excel
            </button>
            <button
              onClick={() => {
                const modTcs = activeMod.features.flatMap((f: FeatureGroup) => f.testCases)
                onOpenRunDialog('module', activeMod.name, modTcs, selectedSuite._id)
              }}
              className="btn-primary h-8 px-3 text-xs"
            >
              Run Module Tests ({activeMod.testCasesCount})
            </button>
          </div>
        )}
      </div>

      {/* Features */}
      {activeMod.features.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-8">
          No features identified under this module.
        </p>
      ) : (
        <div className="space-y-3">
          {activeMod.features.map((feat: FeatureGroup) => {
            const feKey = `${activeMod.name}::${feat.name}`
            const isFeatExpanded = expandedFeatures[feKey]
            const positiveCount = feat.testCases.filter(
              (tc: any) => tc.scenario_type === 'positive'
            ).length
            const negativeCount = feat.testCases.filter(
              (tc: any) => tc.scenario_type === 'negative'
            ).length

            return (
              <div
                key={feat.name}
                className="border border-border bg-card/10 rounded-2xl p-4 space-y-3"
              >
                <div
                  onClick={() =>
                    setExpandedFeatures((prev) => ({ ...prev, [feKey]: !isFeatExpanded }))
                  }
                  className="flex items-start justify-between gap-4 cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-sm text-foreground capitalize">
                        {feat.name}
                      </h5>
                      <Badge variant="secondary" className="font-mono text-[9px] font-bold">
                        {feat.testCases.length} Test Cases
                      </Badge>
                    </div>
                    {feat.description && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {feat.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 font-bold text-primary uppercase">
                      {positiveCount} Positive
                    </span>
                    {negativeCount > 0 && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-muted border border-border font-medium text-muted-foreground uppercase">
                        {negativeCount} Negative
                      </span>
                    )}
                  </div>
                </div>

                {isFeatExpanded && (
                  <div className="space-y-1.5 border-t border-border/40 pt-3">
                    {feat.testCases.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground py-2 italic">
                        No test cases generated.
                      </p>
                    ) : (
                      <div className="divide-y divide-border/20 text-xs">
                        {feat.testCases.map((tc: TestCase) => (
                          <div
                            key={tc.id}
                            onClick={() => {
                              const srsParam = selectedSrsId ? `&srsId=${selectedSrsId}` : ''
                              router.push(
                                `/dashboard/${projectId}/test-cases?caseId=${tc.id}${srsParam}`
                              )
                            }}
                            className="flex items-center justify-between py-2.5 hover:bg-muted/40 px-2.5 rounded-lg cursor-pointer transition-colors gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="text-[10px] font-mono font-bold text-primary flex-shrink-0 min-w-[110px] whitespace-nowrap">
                                {tc.id}
                              </span>
                              <span className="font-semibold text-foreground truncate capitalize">
                                {tc.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getPriorityBadge(tc.priority)}
                              <span
                                className={`text-[8px] px-1.5 py-0.5 rounded border font-semibold uppercase ${
                                  tc.scenario_type === 'positive'
                                    ? 'bg-primary/5 text-primary border-primary/20'
                                    : 'bg-muted/40 text-muted-foreground border-border'
                                }`}
                              >
                                {tc.scenario_type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
