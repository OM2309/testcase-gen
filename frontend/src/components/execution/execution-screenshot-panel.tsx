'use client'

import React from 'react'
import { ImageIcon, ExternalLink, AlertCircle } from 'lucide-react'
import { TestCaseResult } from '../../types'
import { getAssetUrl } from '../../services/executionService'

/**
 * Shows the failure screenshot for the selected test case (if one exists).
 * Screenshots are captured by Agent 3 only on failed steps.
 */
export function ExecutionScreenshotPanel({ testCase }: { testCase: TestCaseResult | null }) {
  const hasShot = !!testCase?.screenshotPath
  const url = getAssetUrl(testCase?.screenshotPath)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-primary" /> Failure Screenshot
        </span>
      </div>

      <div className="p-4">
        {!testCase ? (
          <div className="text-xs text-muted-foreground py-6 text-center">
            Select a test case to view its failure screenshot.
          </div>
        ) : !hasShot ? (
          <div className="text-xs text-muted-foreground py-6 text-center flex flex-col items-center gap-2">
            <ImageIcon className="w-8 h-8 opacity-30" />
            No screenshot for <span className="font-semibold text-foreground">{testCase.testCaseId}</span>.
            <span className="text-[10px]">Screenshots are captured only on failure.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {testCase.errorMessage && (
              <div className="flex items-start gap-2 text-[11px] text-rose-500 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span className="break-words">
                  Step {testCase.failedStepNumber}: {testCase.errorMessage}
                </span>
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Failure screenshot for ${testCase.testCaseId}`}
              className="w-full rounded-lg border border-border"
            />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Open full size
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
