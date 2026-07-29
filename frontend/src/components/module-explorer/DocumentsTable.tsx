'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, ShieldCheck, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RequirementAnalysis, TestSuiteData } from '../../types'

interface DocumentsTableProps {
  docs: any[]
  isJira: boolean
  hasFigma?: boolean
  requirementAnalyses: RequirementAnalysis[]
  testSuites: TestSuiteData[]
  agentRunning: string | null
  runningActionDocId: string | null
  onRunAgent0: (docId: string) => void
  onRunAgent1: (docId: string, mode?: string) => void
  onRunAgent2: (docId: string) => void
}

/**
 * Table listing uploaded SRS documents or imported Jira/Linear user stories with quality scores and agent trigger actions.
 * Supports Figma-only flow: when a doc is Figma-only, scoring is skipped and modules are generated directly.
 */
export function DocumentsTable({
  docs,
  isJira,
  hasFigma = false,
  requirementAnalyses,
  testSuites,
  agentRunning,
  runningActionDocId,
  onRunAgent0,
  onRunAgent1,
  onRunAgent2,
}: DocumentsTableProps) {
  const router = useRouter()

  if (docs.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl py-10 text-center">
        <p className="text-xs text-muted-foreground italic">
          No {isJira ? 'Jira stories imported' : 'requirement documents uploaded'} yet.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-border bg-card/10 rounded-2xl shadow-sm">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
            <th className="p-3.5">Name</th>
            <th className="p-3.5">Uploaded</th>
            <th className="p-3.5 text-center">Quality Score</th>
            <th className="p-3.5 text-center">Status</th>
            <th className="p-3.5 text-center">Approval</th>
            <th className="p-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {docs.map((doc: any) => {
            const targetSrsId = doc._id === 'legacy' ? null : doc._id
            const isFigmaOnlyDoc = doc._id === 'figma-design'
            const analysis =
              requirementAnalyses.find((r: any) => {
                if (isFigmaOnlyDoc) return r.generationMode === 'figma_only' && r.srsDocumentId === null
                return r.srsDocumentId === targetSrsId
              }) || null
            const suite =
              testSuites.find((t: any) => {
                if (isFigmaOnlyDoc) return t.srsDocumentId === null
                return t.srsDocumentId === targetSrsId
              }) || null
            
            const isScored = analysis && analysis.agent0Status === 'completed' && analysis.agent0Score != null
            const isModulesGenerated = analysis && analysis.status === 'completed' && analysis.analyzedData != null
            const isSuiteGenerated = suite && suite.testCases?.length > 0
            const isThisRunning = runningActionDocId === doc._id && agentRunning !== null

            // Determine the generation mode for Agent 1
            const getAgent1Mode = (): string => {
              if (isFigmaOnlyDoc) return 'figma_only'
              if (hasFigma) return 'srs_and_figma'
              return 'srs_only'
            }

            return (
              <tr key={doc._id} className="hover:bg-muted/20 transition-colors">
                <td className="p-3.5 font-semibold text-foreground max-w-[220px] truncate">
                  <button
                    onClick={() => {
                      if (isFigmaOnlyDoc) {
                        router.push(`?srsId=figma-design`)
                      } else {
                        router.push(`?srsId=${doc._id}`)
                      }
                    }}
                    className="hover:underline text-left cursor-pointer text-xs font-semibold text-primary"
                  >
                    {doc.originalFileName || (isJira ? 'Jira Stories' : 'Requirement Specification')}
                  </button>
                </td>
                <td className="p-3.5 text-muted-foreground">
                  {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="p-3.5 text-center">
                  {isFigmaOnlyDoc ? (
                    <span className="text-[10px] text-muted-foreground italic px-2 py-0.5 rounded-full bg-muted/50 border border-border/50">N/A</span>
                  ) : analysis && analysis.agent0Score != null ? (
                    <Badge
                      variant="default"
                      className={`font-mono border ${
                        analysis.agent0Score >= 80
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : analysis.agent0Score >= 60
                          ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
                          : analysis.agent0Score >= 40
                          ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
                          : 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                      }`}
                    >
                      {analysis.agent0Score}%
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">Pending</span>
                  )}
                </td>
                <td className="p-3.5 text-center">
                  {isThisRunning ? (
                    <Badge variant="secondary" className="animate-pulse bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {agentRunning === 'agent0'
                        ? 'Scoring...'
                        : agentRunning === 'agent1'
                        ? 'Extracting Modules...'
                        : 'Generating Suite...'}
                    </Badge>
                  ) : isSuiteGenerated ? (
                    <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400">
                      Suite Generated
                    </Badge>
                  ) : isModulesGenerated ? (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      Modules Generated
                    </Badge>
                  ) : isScored ? (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      Scored
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      New
                    </Badge>
                  )}
                </td>
                <td className="p-3.5 text-center">
                  {isSuiteGenerated ? (
                    (() => {
                      const approvalStatus = suite?.approvalStatus || 'draft'
                      switch (approvalStatus) {
                        case 'approved':
                          return (
                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3 h-3 mr-1" /> Approved
                            </Badge>
                          )
                        case 'pending_approval':
                          return (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                              <Clock className="w-3 h-3 mr-1" /> Pending
                            </Badge>
                          )
                        case 'rejected':
                          return (
                            <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              Changes Requested
                            </Badge>
                          )
                        default:
                          return (
                            <Badge variant="outline" className="text-muted-foreground">
                              Draft
                            </Badge>
                          )
                      }
                    })()
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">—</span>
                  )}
                </td>
                <td className="p-3.5 text-right space-x-2">
                  {isFigmaOnlyDoc ? (
                    /* Figma-only: skip scoring, go directly to modules → suite */
                    !isModulesGenerated ? (
                      <button
                        onClick={() => onRunAgent1(doc._id, 'figma_only')}
                        disabled={agentRunning !== null}
                        className="btn-primary h-7 px-3 text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                      >
                        {agentRunning === 'agent1' && runningActionDocId === doc._id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Extracting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" /> Generate Modules
                          </>
                        )}
                      </button>
                    ) : !isSuiteGenerated ? (
                      <button
                        onClick={() => onRunAgent2(doc._id)}
                        disabled={agentRunning !== null}
                        className="btn-primary h-7 px-3 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        {agentRunning === 'agent2' && runningActionDocId === doc._id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" /> Generate Suite
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`?srsId=figma-design`)}
                        className="btn-secondary h-7 px-3 text-[10px] font-bold cursor-pointer"
                      >
                        View Modules
                      </button>
                    )
                  ) : (
                    /* SRS / Jira / Linear: existing linear flow (Score → Modules → Suite) */
                    !isScored ? (
                    <button
                      onClick={() => onRunAgent0(doc._id)}
                      disabled={agentRunning !== null}
                      className="btn-primary h-7 px-3 text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                    >
                      {agentRunning === 'agent0' && runningActionDocId === doc._id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> Scoring...
                        </>
                      ) : isJira ? (
                        'Analyze Stories'
                      ) : (
                        'Analyze Document'
                      )}
                    </button>
                  ) : !isModulesGenerated ? (
                    <button
                      onClick={() => onRunAgent1(doc._id, getAgent1Mode())}
                      disabled={agentRunning !== null}
                      className="btn-primary h-7 px-3 text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                    >
                      {agentRunning === 'agent1' && runningActionDocId === doc._id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> Extracting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" /> Generate Modules
                          {hasFigma && (
                            <span className="ml-0.5 text-[8px] font-bold text-purple-500 uppercase">+ Figma</span>
                          )}
                        </>
                      )}
                    </button>
                  ) : !isSuiteGenerated ? (
                    <button
                      onClick={() => onRunAgent2(doc._id)}
                      disabled={agentRunning !== null}
                      className="btn-primary h-7 px-3 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {agentRunning === 'agent2' && runningActionDocId === doc._id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" /> Generate Suite
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`?srsId=${doc._id}`)}
                      className="btn-secondary h-7 px-3 text-[10px] font-bold cursor-pointer"
                    >
                      View Modules
                    </button>
                  )
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
