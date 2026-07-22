'use client'

import React, { useState } from 'react'
import {
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { RequirementAnalysis, Agent0Feedback } from '../../types'

interface AccuracyScoreCardProps {
  analysis: RequirementAnalysis
  onOpenGapFill?: () => void
}

export function getScoreColorConfig(score: number) {
  if (score >= 80) {
    return {
      text: 'text-emerald-500 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      cardBg: 'bg-emerald-500/5 border-emerald-500/20',
      icon: 'text-emerald-500',
      label: 'Excellent Specification',
    }
  } else if (score >= 60) {
    return {
      text: 'text-orange-500 dark:text-orange-400',
      bg: 'bg-orange-500/10 dark:bg-orange-500/15',
      border: 'border-orange-500/30',
      badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
      cardBg: 'bg-orange-500/5 border-orange-500/20',
      icon: 'text-orange-500',
      label: 'Good / Moderate Details',
    }
  } else if (score >= 40) {
    return {
      text: 'text-yellow-500 dark:text-yellow-400',
      bg: 'bg-yellow-500/10 dark:bg-yellow-500/15',
      border: 'border-yellow-500/30',
      badge: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
      cardBg: 'bg-yellow-500/5 border-yellow-500/20',
      icon: 'text-yellow-500',
      label: 'Needs Improvement',
    }
  } else {
    return {
      text: 'text-red-500 dark:text-red-400',
      bg: 'bg-red-500/10 dark:bg-red-500/15',
      border: 'border-red-500/30',
      badge: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
      cardBg: 'bg-red-500/5 border-red-500/20',
      icon: 'text-red-500',
      label: 'Insufficient Specification',
    }
  }
}

/**
 * Card displaying Agent 0 requirement score, summary, and full structured feedback (strengths, missing details, ambiguities, recommendations).
 */
export function AccuracyScoreCard({ analysis, onOpenGapFill }: AccuracyScoreCardProps) {
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(true)

  const score = analysis.agent0Score ?? 0
  const colorConfig = getScoreColorConfig(score)

  const parseFeedback = (): Agent0Feedback => {
    const fb = analysis.agent0Feedback
    if (!fb) {
      return { summary: '', strengths: [], missing_details: [], ambiguities: [], recommendations: [] }
    }
    if (typeof fb === 'string') {
      try {
        const parsed = JSON.parse(fb)
        return {
          summary: parsed.summary || '',
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
          missing_details: Array.isArray(parsed.missing_details) ? parsed.missing_details : [],
          ambiguities: Array.isArray(parsed.ambiguities) ? parsed.ambiguities : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        }
      } catch {
        return { summary: fb, strengths: [], missing_details: [], ambiguities: [], recommendations: [] }
      }
    }
    return {
      summary: fb.summary || '',
      strengths: Array.isArray(fb.strengths) ? fb.strengths : [],
      missing_details: Array.isArray(fb.missing_details) ? fb.missing_details : [],
      ambiguities: Array.isArray(fb.ambiguities) ? fb.ambiguities : [],
      recommendations: Array.isArray(fb.recommendations) ? fb.recommendations : [],
    }
  }

  const feedback = parseFeedback()

  const totalFeedbackItems =
    feedback.strengths.length +
    feedback.missing_details.length +
    feedback.ambiguities.length +
    feedback.recommendations.length

  return (
    <div className="border border-border bg-card/20 rounded-2xl p-6 space-y-6">
      {/* Top Banner: Rating Header & Score Box */}
      <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
        <div className="lg:w-[72%] flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-lg font-extrabold text-foreground">Requirement Accuracy Analysis</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorConfig.badge}`}>
                {colorConfig.label}
              </span>
            </div>
            {feedback.summary && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {feedback.summary}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap mt-1">
            {totalFeedbackItems > 0 && (
              <button
                onClick={() => setIsFeedbackExpanded(!isFeedbackExpanded)}
                className="text-primary font-bold text-xs inline-flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                {isFeedbackExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Collapse Document Feedback
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Show Document Feedback
                  </>
                )}
              </button>
            )}

            {onOpenGapFill && (
              <button
                onClick={onOpenGapFill}
                className="btn-secondary text-[11px] h-7 px-3 cursor-pointer inline-flex items-center gap-1.5 ml-auto"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-primary" />
                {analysis.gapFillData ? 'View Missing Test Cases' : 'Generate Missing Test Cases (AI)'}
              </button>
            )}
          </div>
        </div>

        {/* Score Box */}
        <div className={`lg:w-[25%] rounded-2xl p-5 flex flex-col items-center justify-center text-center border ${colorConfig.cardBg}`}>
          <BrainCircuit className={`w-9 h-9 animate-pulse mb-2 ${colorConfig.icon}`} />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Requirement Score
          </span>
          <span className={`text-5xl font-black my-2.5 ${colorConfig.text}`}>{score}%</span>
          <span className="text-[10px] text-muted-foreground">Evaluated by Agent 0</span>
        </div>
      </div>

      {/* Structured Agent 0 Feedback Sections */}
      {isFeedbackExpanded && totalFeedbackItems > 0 && (
        <div className="pt-4 border-t border-border/60 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {/* Strengths */}
          {feedback.strengths.length > 0 && (
            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Strengths ({feedback.strengths.length})</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {feedback.strengths.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-emerald-500 font-bold select-none">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Details */}
          {feedback.missing_details.length > 0 && (
            <div className="border border-orange-500/20 bg-orange-500/5 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Missing Details ({feedback.missing_details.length})</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {feedback.missing_details.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-orange-500 font-bold select-none">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ambiguities */}
          {feedback.ambiguities.length > 0 && (
            <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-bold text-xs">
                <HelpCircle className="w-4 h-4 flex-shrink-0" />
                <span>Ambiguities ({feedback.ambiguities.length})</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {feedback.ambiguities.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-yellow-500 font-bold select-none">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {feedback.recommendations.length > 0 && (
            <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs">
                <Lightbulb className="w-4 h-4 flex-shrink-0" />
                <span>Recommendations ({feedback.recommendations.length})</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {feedback.recommendations.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-blue-500 font-bold select-none">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

