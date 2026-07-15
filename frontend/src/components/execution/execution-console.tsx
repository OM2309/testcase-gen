'use client'

import React, { useEffect, useRef } from 'react'
import { Terminal, CheckCircle2, XCircle, Info } from 'lucide-react'
import { ExecutionLog } from '../../types'
import { formatTime } from './execution-utils'

const LEVEL_STYLE: Record<string, { color: string; icon: React.ReactNode }> = {
  success: { color: 'text-primary', icon: <CheckCircle2 className="w-3 h-3 text-primary" /> },
  error: { color: 'text-error', icon: <XCircle className="w-3 h-3 text-error" /> },
  info: { color: 'text-muted-foreground', icon: <Info className="w-3 h-3 text-muted-foreground" /> }
}

export function ExecutionConsole({ logs, isPolling }: { logs: ExecutionLog[]; isPolling: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the newest log whenever logs change.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-primary" /> Execution Console
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground tabular-nums">{logs.length} lines</span>
          {isPolling && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-[240px] max-h-[440px] overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed bg-background/60"
      >
        {logs.length === 0 ? (
          <div className="text-muted-foreground py-6 text-center">Waiting for execution logs…</div>
        ) : (
          logs.map((log, idx) => {
            const style = LEVEL_STYLE[log.level] || LEVEL_STYLE.info
            return (
              <div key={idx} className="flex items-start gap-2 py-0.5">
                <span className="text-muted-foreground/50 tabular-nums flex-shrink-0">{formatTime(log.timestamp)}</span>
                <span className={`flex-shrink-0 mt-0.5 ${style.color}`}>{style.icon}</span>
                <span className={`break-words ${style.color === 'text-muted-foreground' ? 'text-foreground/80' : style.color}`}>
                  {log.message}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
