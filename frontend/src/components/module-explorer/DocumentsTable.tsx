'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RequirementAnalysis, TestSuiteData } from '../../types'

interface DocumentsTableProps {
  docs: any[]
  isJira: boolean
  requirementAnalyses: RequirementAnalysis[]
  testSuites: TestSuiteData[]
  agentRunning: string | null
  runningActionDocId: string | null
  onRunAgent1: (docId: string) => void
  onRunAgent2: (docId: string) => void
}

/**
 * Table listing uploaded SRS documents or imported Jira/Linear user stories with quality scores and agent trigger actions.
 */
export function DocumentsTable({
  docs,
  isJira,
  requirementAnalyses,
  testSuites,
  agentRunning,
  runningActionDocId,
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
            <th className="p-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {docs.map((doc: any) => {
            const targetSrsId = doc._id === 'legacy' ? null : doc._id
            const analysis =
              requirementAnalyses.find((r: any) => r.srsDocumentId === targetSrsId) || null
            const suite =
              testSuites.find((t: any) => t.srsDocumentId === targetSrsId) || null
            const isAnalyzed = analysis && analysis.status === 'completed'
            const isAnalyzing = analysis && analysis.status === 'analyzing'
            const isSuiteGenerated = suite && suite.testCases?.length > 0
            const isThisRunning = agentRunning === 'agent1' && runningActionDocId === doc._id

            return (
              <tr key={doc._id} className="hover:bg-muted/20 transition-colors">
                <td className="p-3.5 font-semibold text-foreground max-w-[220px] truncate">
                  <button
                    onClick={() => router.push(`?srsId=${doc._id}`)}
                    className="hover:underline text-left cursor-pointer text-xs font-semibold text-primary"
                  >
                    {doc.originalFileName || (isJira ? 'Jira Stories' : 'Requirement Specification')}
                  </button>
                </td>
                <td className="p-3.5 text-muted-foreground">
                  {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="p-3.5 text-center">
                  {isAnalyzed && analysis && analysis.agent0Score != null ? (
                    <Badge variant="default" className="font-mono bg-primary/20 text-primary border border-primary/30">
                      {analysis.agent0Score}%
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">Pending</span>
                  )}
                </td>
                <td className="p-3.5 text-center">
                  {isAnalyzing || isThisRunning ? (
                    <Badge variant="secondary" className="animate-pulse bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Analyzing
                    </Badge>
                  ) : isSuiteGenerated ? (
                    <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400">
                      Suite Generated
                    </Badge>
                  ) : isAnalyzed ? (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      Analyzed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      New
                    </Badge>
                  )}
                </td>
                <td className="p-3.5 text-right space-x-2">
                  {!isAnalyzed ? (
                    <button
                      onClick={() => onRunAgent1(doc._id)}
                      disabled={agentRunning !== null}
                      className="btn-primary h-7 px-3 text-[10px] font-bold cursor-pointer"
                    >
                      {agentRunning === 'agent1' && runningActionDocId === doc._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isJira ? (
                        'Analyze Stories'
                      ) : (
                        'Analyze PRD'
                      )}
                    </button>
                  ) : !isSuiteGenerated ? (
                    <button
                      onClick={() => onRunAgent2(doc._id)}
                      disabled={agentRunning !== null}
                      className="btn-primary h-7 px-3 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {agentRunning === 'agent2' && runningActionDocId === doc._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
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
