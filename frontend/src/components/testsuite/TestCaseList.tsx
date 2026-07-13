'use client'

import React from 'react'
import { Search, Trash2, PlayCircle } from 'lucide-react'
import { getPriorityBadge } from '../../helpers/utils'
import { TestCase } from '../../types'

interface TestCaseListProps {
  modules: Array<{ name: string; count: number }>
  selectedModule: string
  onSelectModule: (m: string) => void
  testCases: TestCase[]
  selectedId: string | null
  onSelect: (id: string) => void
  search: string
  onSearch: (v: string) => void
  onDelete: (id: string) => void
  onRun?: (id: string) => void
  onToggleRegressive?: (id: string) => void
}

/** Left module nav + center searchable test-case list (two grid columns). */
export function TestCaseList({
  modules, selectedModule, onSelectModule, testCases, selectedId, onSelect, search, onSearch, onDelete, onRun, onToggleRegressive
}: TestCaseListProps) {
  return (
    <>
      {/* Module sidebar */}
      <div className="lg:col-span-2 space-y-1.5">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">Modules</h3>
        {modules.map(m => (
          <button
            key={m.name}
            onClick={() => onSelectModule(m.name)}
            className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-between ${selectedModule === m.name ? 'bg-primary/10 text-primary border-l-[3px] border-primary pl-[10px]' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <span className="line-clamp-1">{m.name}</span>
            <span className="text-[10px] bg-border/60 px-1.5 py-0.5 rounded font-mono">{m.count}</span>
          </button>
        ))}
      </div>

      {/* Test case list */}
      <div className="lg:col-span-10 border border-border rounded-xl bg-card overflow-hidden">
        <div className="p-3 border-b border-border bg-muted/20">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Search test cases..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="divide-y divide-border/60 max-h-[65vh] overflow-y-auto">
          {testCases.map((tc) => (
            <div
              key={tc.id}
              onClick={() => onSelect(tc.id)}
              className={`group px-4 py-2.5 cursor-pointer transition-all hover:bg-muted/30 ${selectedId === tc.id ? 'bg-primary/5 border-l-[3px] border-primary pl-[13px]' : ''}`}
            >
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center h-4" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={tc.isRegressive || false}
                      onChange={() => onToggleRegressive?.(tc.id)}
                      title="Mark as Regressive"
                      className="w-3.5 h-3.5 text-primary border-border rounded focus:ring-primary/40 bg-background cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-primary flex-shrink-0 min-w-[110px] whitespace-nowrap">{tc.id}</span>
                  <span className="text-xs font-semibold text-foreground truncate min-w-0 flex-1" title={tc.title}>
                    {tc.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 font-medium hidden md:inline flex-shrink-0">
                    ({tc.module || 'General'} · {tc.steps.length} steps)
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {getPriorityBadge(tc.priority)}
                  {tc.isRegressive && (
                    <span className="text-[9px] bg-muted text-muted-foreground border border-border px-1 py-0.2 rounded font-semibold uppercase tracking-wider">Regressive</span>
                  )}
                  
                  <div className="flex items-center gap-0.5">
                    {onRun && (
                      <button
                        onClick={e => { e.stopPropagation(); onRun(tc.id) }}
                        title="Run this test case"
                        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(tc.id) }}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {testCases.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground">No test cases found.</div>
          )}
        </div>
      </div>
    </>
  )
}
