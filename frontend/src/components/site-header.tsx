'use client'

import React from "react"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Loader2 } from "lucide-react"
import { useProject } from "../contexts/ProjectContext"

interface SiteHeaderProps {
  title?: string
}

export function SiteHeader({ title = 'Documents' }: SiteHeaderProps) {
  const { agentRunning } = useProject()

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 data-vertical:self-auto"
          />
          <h1 className="text-base font-medium">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {agentRunning && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded bg-primary/10 text-primary border border-primary/20">
              <Loader2 className="w-3 h-3 animate-spin" />
              {agentRunning === 'agent1'
                ? 'Extracting requirements...'
                : agentRunning === 'agent2'
                  ? 'Generating test cases...'
                  : 'Analyzing requirement gaps...'}
            </span>
          )}
          {/* <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            API Connected
          </span> */}
        </div>
      </div>
    </header>
  )
}
