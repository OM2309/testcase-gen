'use client'

import React, { useState } from 'react'
import { BrainCircuit } from 'lucide-react'
import { RequirementAnalysis } from '../../types'

interface AccuracyScoreCardProps {
  analysis: RequirementAnalysis
}

/**
 * Card displaying Agent 0 requirement score, summary, and gap analysis feedback.
 */
export function AccuracyScoreCard({ analysis }: AccuracyScoreCardProps) {
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(false)

  const getFeedbackSummary = (): string => {
    const fb = analysis.agent0Feedback
    if (fb && typeof fb === 'object' && 'summary' in fb) return (fb as any).summary
    if (typeof fb === 'string') return fb
    return ''
  }

  return (
    <div className="border border-border bg-card/20 rounded-2xl p-6 flex flex-col lg:flex-row items-stretch justify-between gap-6">
      <div className="lg:w-[70%] flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <h4 className="text-lg font-extrabold text-foreground">Accuracy Rating</h4>
          <div
            className={`space-y-3 text-xs ${
              !isFeedbackExpanded
                ? 'max-h-[160px] overflow-hidden'
                : 'max-h-[350px] overflow-y-auto pr-2 custom-scrollbar'
            }`}
          >
            <p className="text-muted-foreground leading-relaxed">{getFeedbackSummary()}</p>
          </div>
          <button
            onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
            className="text-primary font-bold text-xs hover:underline cursor-pointer"
          >
            {isFeedbackExpanded ? 'Show Less' : 'Show Full Feedback & Gaps'}
          </button>
        </div>
      </div>
      <div className="lg:w-[26%] bg-primary/5 border border-primary/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
        <BrainCircuit className="w-10 h-10 text-primary animate-pulse mb-3" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Requirement Score
        </span>
        <span className="text-5xl font-black text-primary my-2">{analysis.agent0Score}%</span>
        <span className="text-[10px] text-muted-foreground mt-1">Extracted with GPT-4o</span>
      </div>
    </div>
  )
}
