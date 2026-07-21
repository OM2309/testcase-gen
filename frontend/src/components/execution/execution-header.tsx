'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCw, RefreshCw, PlayCircle, FolderKanban, Clock, FileDown, StopCircle, Send, Loader2 } from 'lucide-react'
import { TestRun } from '../../types'
import { ExecutionStatusBadge } from './execution-status-badge'
import { formatTime, elapsedBetween } from './execution-utils'
import { downloadPdfReport } from '../../utils/pdfGenerator'
import { slackService } from '../../services/slackService'
import { toast } from 'sonner'
import { SlackShareModal } from './slack-share-modal'

interface ExecutionHeaderProps {
  run: TestRun
  isPolling: boolean
  onRefresh: () => void
  onRerun?: () => void
  rerunning?: boolean
  onCancel?: () => void
  cancelling?: boolean
}

export function ExecutionHeader({ run, isPolling, onRefresh, onRerun, rerunning, onCancel, cancelling }: ExecutionHeaderProps) {
  const router = useRouter()
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [checkingSlack, setCheckingSlack] = useState(false)

  const handleSlackShare = async () => {
    setCheckingSlack(true)
    try {
      const statusRes = await slackService.getStatus()
      if (statusRes.success && statusRes.data.connected) {
        setShareModalOpen(true)
      } else {
        toast.error('Slack is not connected. Redirecting to Profile page to connect Slack.')
        router.push('/dashboard/profile')
      }
    } catch (err) {
      toast.error('Failed to verify Slack status.')
    } finally {
      setCheckingSlack(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              {run.suiteName || 'Test Run'}
            </h1>
            <ExecutionStatusBadge status={run.status} size="md" />
            {isPolling && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Live
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5" /> {run.projectName || '—'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Started {formatTime(run.startedAt)}
            </span>
            {run.completedAt && (
              <span>Finished {formatTime(run.completedAt)}</span>
            )}
            <span>Duration {elapsedBetween(run.startedAt, run.completedAt)}</span>
            {run.runConfig?.baseUrl && (
              <span className="font-mono truncate max-w-[220px]">{run.runConfig.baseUrl}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="btn-secondary"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => downloadPdfReport(run)}
            disabled={run.status === 'running' || run.status === 'queued'}
            className="btn-secondary"
            title="Download PDF execution report"
          >
            <FileDown className="w-3.5 h-3.5 text-primary" /> Report PDF
          </button>
          <button
            onClick={handleSlackShare}
            disabled={checkingSlack || run.status === 'running' || run.status === 'queued'}
            className="btn-secondary"
            title="Share report on Slack"
          >
            {checkingSlack ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#4A154B]" />
            )}
            Share Slack
          </button>
          {onCancel && (run.status === 'running' || run.status === 'queued') && (
            <button
              onClick={onCancel}
              disabled={cancelling}
              className="btn-secondary"
              title="Abort running execution"
            >
              <StopCircle className={`w-3.5 h-3.5 ${cancelling ? 'animate-pulse' : ''}`} />
              {cancelling ? 'Stopping...' : 'Stop Run'}
            </button>
          )}
          {onRerun && (
            <button
              onClick={onRerun}
              disabled={rerunning || run.status === 'running' || run.status === 'queued'}
              className="btn-primary"
            >
              <RotateCw className={`w-3.5 h-3.5 ${rerunning ? 'animate-spin' : ''}`} />
              {rerunning ? 'Starting...' : 'Re-run'}
            </button>
          )}
        </div>
      </div>

      <SlackShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        run={run}
      />
    </div>
  )
}
