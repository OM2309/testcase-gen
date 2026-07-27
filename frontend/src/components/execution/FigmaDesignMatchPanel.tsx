'use client'

import React, { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, ImageIcon, Eye, ExternalLink } from 'lucide-react'
import { TestCaseResult } from '../../types'
import { getAssetUrl } from '../../services/executionService'

interface Frame {
  id: string
  name: string
  imageUrl: string
}

interface FigmaDesignMatchPanelProps {
  testCase: TestCaseResult | null
  frames: Frame[]
}

export function FigmaDesignMatchPanel({ testCase, frames }: FigmaDesignMatchPanelProps) {
  const [activeTab, setActiveTab] = useState<'design' | 'actual' | 'diff'>('actual')

  if (!testCase) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
        Select a test case to view Figma design compliance details.
      </div>
    )
  }

  const result = testCase.designMatchResult
  const isMapped = !!testCase.figmaFrameId

  if (!isMapped || !result || result.status === 'none') {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-2">
        <AlertTriangle className="w-8 h-8 text-muted-foreground/60 mx-auto" />
        <h4 className="text-xs font-semibold text-foreground">No Design Mapping Linked</h4>
        <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">
          This test case is not mapped to any Figma design screen. Run a visual compliance check with linked screens.
        </p>
      </div>
    )
  }

  // Resolve URLs
  const frame = frames.find(f => f.id === testCase.figmaFrameId)
  const designUrl = frame?.imageUrl || ''
  const actualUrl = getAssetUrl(testCase.screenshotPath)
  const diffUrl = getAssetUrl(result.visualDiffPath)

  const isMatch = result.status === 'match'
  const isError = result.status === 'error'

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs flex flex-col space-y-4 p-4">
      
      {/* Header bar */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-primary" /> Figma Compliance Audit
          </span>
          <h4 className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
            Target Frame: <span className="font-semibold text-foreground">{frame?.name || 'Unknown'}</span>
          </h4>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          {isError ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full border border-rose-500/20">
              <XCircle className="w-3 h-3" /> Execution Error
            </span>
          ) : isMatch ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" /> {result.similarityScore}% Match
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full border border-rose-500/20">
              <XCircle className="w-3 h-3" /> {100 - result.similarityScore}% Mismatch
            </span>
          )}
        </div>
      </div>

      {/* Discrepancies listing */}
      {result.discrepancies && result.discrepancies.length > 0 && (
        <div className="bg-rose-500/5 border border-rose-500/15 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 uppercase tracking-wide">
            <AlertTriangle className="w-3.5 h-3.5" /> AI Audited Visual Discrepancies
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {result.discrepancies.map((gap, idx) => (
              <li key={idx} className="text-[10.5px] text-muted-foreground font-medium leading-relaxed">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interactive Tabs selector */}
      <div className="flex bg-muted/40 border border-border/80 rounded-lg p-0.5">
        <button
          onClick={() => setActiveTab('design')}
          disabled={!designUrl}
          className={`flex-1 text-[10.5px] font-bold py-1.5 rounded-md transition cursor-pointer disabled:opacity-40 ${
            activeTab === 'design'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Figma Design
        </button>
        <button
          onClick={() => setActiveTab('actual')}
          disabled={!actualUrl}
          className={`flex-1 text-[10.5px] font-bold py-1.5 rounded-md transition cursor-pointer disabled:opacity-40 ${
            activeTab === 'actual'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Actual UI
        </button>
        <button
          onClick={() => setActiveTab('diff')}
          disabled={!diffUrl}
          className={`flex-1 text-[10.5px] font-bold py-1.5 rounded-md transition cursor-pointer disabled:opacity-40 ${
            activeTab === 'diff'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Visual Diff
        </button>
      </div>

      {/* Image display viewport */}
      <div className="bg-black/10 rounded-lg border border-border/60 overflow-hidden flex items-center justify-center p-4 relative min-h-[220px]">
        {activeTab === 'design' && designUrl && (
          <img
            src={designUrl}
            alt="Figma Design Frame"
            className="max-h-[300px] object-contain rounded shadow"
          />
        )}
        {activeTab === 'actual' && actualUrl && (
          <img
            src={actualUrl}
            alt="Actual App Screenshot"
            className="max-h-[300px] object-contain rounded shadow"
          />
        )}
        {activeTab === 'diff' && diffUrl && (
          <img
            src={diffUrl}
            alt="Visual Diff Highlight"
            className="max-h-[300px] object-contain rounded shadow"
          />
        )}

        {activeTab === 'design' && !designUrl && (
          <span className="text-[10px] text-muted-foreground">Figma frame image URL is empty.</span>
        )}
        {activeTab === 'actual' && !actualUrl && (
          <span className="text-[10px] text-muted-foreground">Actual UI screenshot is empty.</span>
        )}
        {activeTab === 'diff' && !diffUrl && (
          <span className="text-[10px] text-muted-foreground">Visual diff image was not generated.</span>
        )}
      </div>

      {/* Open full resolution buttons */}
      <div className="flex gap-4 text-[10px] font-bold text-primary">
        {activeTab === 'design' && designUrl && (
          <a href={designUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> View Design Full Size
          </a>
        )}
        {activeTab === 'actual' && actualUrl && (
          <a href={actualUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> View Live Screenshot Full Size
          </a>
        )}
        {activeTab === 'diff' && diffUrl && (
          <a href={diffUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" /> View Diff Highlight Full Size
          </a>
        )}
      </div>
      
    </div>
  )
}
