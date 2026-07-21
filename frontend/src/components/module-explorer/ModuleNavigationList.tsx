'use client'

import React from 'react'
import { Layers } from 'lucide-react'
import { ModuleGroup } from '../../types'

interface ModuleNavigationListProps {
  modules: ModuleGroup[]
  activeModuleName: string | null
  onSelectModule: (name: string) => void
}

/**
 * Sidebar navigation list for switching between extracted modules.
 */
export function ModuleNavigationList({
  modules,
  activeModuleName,
  onSelectModule,
}: ModuleNavigationListProps) {
  return (
    <div className="lg:col-span-3 space-y-2">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-1">
        Modules list
      </span>
      <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
        {modules.map((mod: ModuleGroup) => {
          const isActive = mod.name === activeModuleName
          return (
            <button
              key={mod.name}
              onClick={() => onSelectModule(mod.name)}
              className={`flex-shrink-0 text-left px-4 py-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 cursor-pointer w-full ${
                isActive
                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                  : 'bg-card/40 border-border hover:bg-card/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Layers
                  className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <span className="truncate capitalize">{mod.name}</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  isActive ? 'bg-primary/20 text-primary font-bold' : 'bg-muted text-muted-foreground'
                }`}
              >
                {mod.testCasesCount}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
