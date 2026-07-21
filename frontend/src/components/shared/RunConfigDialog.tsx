'use client'

import React from 'react'
import { PlayCircle, AlertCircle, Loader2, Play } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RunTarget } from '../../types'

interface RunConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  runTarget: RunTarget | null
  runBaseUrl: string
  setRunBaseUrl: (url: string) => void
  runHeadless: boolean
  setRunHeadless: (headless: boolean) => void
  starting: boolean
  runError: string | null
  onStartRun: () => void
}

/**
 * Reusable modal for configuring test execution run parameters (Base URL, Headless mode).
 */
export function RunConfigDialog({
  open,
  onOpenChange,
  runTarget,
  runBaseUrl,
  setRunBaseUrl,
  runHeadless,
  setRunHeadless,
  starting,
  runError,
  onStartRun,
}: RunConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-primary" />
            Run Test Execution
          </DialogTitle>
          <DialogDescription>
            Configure browser environment to execute tests for {runTarget?.type}{' '}
            <strong>{runTarget?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 text-xs">
          {runError && (
            <div className="border border-border bg-muted/40 text-muted-foreground p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
              {runError}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="font-semibold text-foreground">Target Base URL</label>
            <input
              type="text"
              value={runBaseUrl}
              onChange={(e) => setRunBaseUrl(e.target.value)}
              placeholder="http://localhost:3000"
              className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
            />
          </div>
          <div className="flex items-center justify-between border border-border/60 bg-muted/20 p-3 rounded-xl">
            <div>
              <span className="font-semibold block text-foreground">Run Headless</span>
              <span className="text-[10px] text-muted-foreground">
                Execute browser in the background.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRunHeadless(!runHeadless)}
              className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                runHeadless ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                  runHeadless ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onStartRun} disabled={starting} className="btn-primary">
            {starting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Start Execution
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
