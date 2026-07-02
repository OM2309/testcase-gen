'use client'

import React, { useState, useEffect } from 'react'
import { Play, X, Globe, Monitor, Zap, TerminalSquare, Info, ShieldCheck, FileSpreadsheet, HelpCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TestCasesViewProps {
  testSuiteId: string
  testCases: any[]
  onRunTestSuite: (baseUrl: string, headless: boolean) => void
}

export function TestCasesView({ testSuiteId, testCases = [], onRunTestSuite }: TestCasesViewProps) {
  const [selectedTestCase, setSelectedTestCase] = useState<any | null>(null)
  const [selectedModule, setSelectedModule] = useState<string>('All')
  const [baseUrl, setBaseUrl] = useState('http://localhost:5173')
  const [headless, setHeadless] = useState(false)
  const [showRunModal, setShowRunModal] = useState(false)
  const [modulesList, setModulesList] = useState<Array<{ name: string; count: number }>>([])

  useEffect(() => {
    const modulesMap = new Map<string, number>()
    let totalCount = 0

    testCases.forEach(tc => {
      const mod = tc.module || 'General'
      modulesMap.set(mod, (modulesMap.get(mod) || 0) + 1)
      totalCount++
    })

    const list = Array.from(modulesMap.entries()).map(([name, count]) => ({ name, count }))
    list.sort((a, b) => b.count - a.count)
    setModulesList([{ name: 'All', count: totalCount }, ...list])

    if (testCases.length > 0 && !selectedTestCase) {
      setSelectedTestCase(testCases[0])
    }
  }, [testCases])

  const filteredTestCases = selectedModule === 'All'
    ? testCases
    : testCases.filter(tc => (tc.module || 'General') === selectedModule)

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 uppercase">▲ Critical</span>
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">▲ High</span>
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">● Medium</span>
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20 uppercase">▼ Low</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground uppercase">{priority || 'N/A'}</span>
    }
  }

  const getActionStyled = (action: string) => {
    return <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono text-xs">{action}</span>
  }

  const handleLaunchRun = () => {
    setShowRunModal(false)
    onRunTestSuite(baseUrl, headless)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-border bg-card rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Test Suite Workspace</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {testCases.length} automated test cases ready to execute via Playwright.
          </p>
        </div>
        <Button
          onClick={() => setShowRunModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wider"
        >
          <Play className="w-4 h-4 fill-current" /> Run Tests
        </Button>
      </div>

      {/* ShadCN Dialog Modal — Radix UI handles portal + z-index correctly */}
      <Dialog open={showRunModal} onOpenChange={setShowRunModal}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <TerminalSquare className="w-5 h-5 text-primary" />
              <DialogTitle>Configure Test Run</DialogTitle>
            </div>
            <DialogDescription>
              Set the target environment before launching Playwright.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Base URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Target Base URL
              </Label>
              <Input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:5173"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">The root URL of your web application under test.</p>
            </div>

            {/* Browser Mode */}
            <div className="border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Browser Mode</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHeadless(false)}
                  className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${
                    !headless
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <Monitor className="w-5 h-5" />
                  <span className="text-sm font-semibold">Headed</span>
                  <span className="text-[10px] leading-tight opacity-80">Browser window visible</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHeadless(true)}
                  className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all ${
                    headless
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted/20 text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  <span className="text-sm font-semibold">Headless</span>
                  <span className="text-[10px] leading-tight opacity-80">Faster, no window</span>
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setShowRunModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleLaunchRun} className="flex-1 gap-2">
              <Play className="w-4 h-4 fill-current" /> Launch Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Module Nav sidebar (Col 1) */}
        <div className="lg:col-span-1 space-y-2 border border-border rounded-xl p-4 bg-card/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2">Filters</h3>
          {modulesList.map((m) => (
            <button
              key={m.name}
              onClick={() => setSelectedModule(m.name)}
              className={`w-full text-left px-3 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-between ${selectedModule === m.name ? 'bg-secondary text-foreground font-semibold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              <span className="line-clamp-1">{m.name}</span>
              <span className="text-[10px] bg-border px-2 py-0.5 rounded-full font-mono text-muted-foreground">{m.count}</span>
            </button>
          ))}
        </div>

        {/* Testcases List grid (Col 2-3) */}
        <div className="lg:col-span-2 border border-border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold">
                  <th className="p-3 w-16">ID</th>
                  <th className="p-3">Title</th>
                  <th className="p-3 w-28">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredTestCases.map((tc, idx) => (
                  <tr
                    key={tc.id || idx}
                    onClick={() => setSelectedTestCase(tc)}
                    className={`hover:bg-muted/30 cursor-pointer transition-colors ${selectedTestCase?.id === tc.id ? 'bg-primary/5' : ''}`}
                  >
                    <td className="p-3 font-mono font-semibold text-primary">{tc.id || `TC-${idx + 1}`}</td>
                    <td className="p-3 font-medium text-foreground line-clamp-1 py-4">{tc.title}</td>
                    <td className="p-3">{getPriorityBadge(tc.priority || tc.priority_level)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right drawer detail panel (Col 4) */}
        <div className="lg:col-span-1 border border-border rounded-xl bg-card/30 p-5 space-y-5 h-full min-h-[500px] overflow-y-auto">
          {selectedTestCase ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-border/40 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-primary">{selectedTestCase.id}</span>
                    <span className="text-[10px] bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground">1 version</span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground mt-2 leading-relaxed">{selectedTestCase.title}</h3>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><Info className="w-3.5 h-3.5 text-primary" /> Description</span>
                <p className="text-xs text-muted-foreground leading-relaxed pl-1 pt-1">{selectedTestCase.description || 'No description provided.'}</p>
              </div>

              {selectedTestCase.preconditions && selectedTestCase.preconditions.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Preconditions</span>
                  <ol className="space-y-1 pl-5 list-decimal text-xs text-muted-foreground leading-relaxed">
                    {selectedTestCase.preconditions.map((pre: string, idx: number) => (
                      <li key={idx}>{pre}</li>
                    ))}
                  </ol>
                </div>
              )}

              {selectedTestCase.steps && selectedTestCase.steps.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Execution Steps</span>
                  <div className="space-y-3 pl-1">
                    {selectedTestCase.steps.map((step: any, sIdx: number) => (
                      <div key={sIdx} className="border border-border/60 bg-muted/15 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                          <span>STEP {step.step_number || sIdx + 1}</span>
                          {getActionStyled(step.action)}
                        </div>
                        {step.target && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="font-semibold">Target:</span>
                            <span className="font-mono bg-border px-1.5 py-0.5 rounded text-foreground">{step.target}</span>
                          </div>
                        )}
                        {step.value && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="font-semibold">Value:</span>
                            <span className="font-mono bg-border px-1.5 py-0.5 rounded text-foreground">{step.value}</span>
                          </div>
                        )}
                        <p className="text-xs text-foreground font-medium pt-1 leading-relaxed">{step.description}</p>
                        {step.expected_result && (
                          <div className="text-[10px] text-emerald-400 border-t border-border/40 pt-1.5 mt-1">
                            <span className="font-bold uppercase tracking-wider text-[9px] mr-1 block text-muted-foreground">Expected:</span>
                            {step.expected_result}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground text-xs flex flex-col items-center gap-2">
              <HelpCircle className="w-8 h-8 opacity-45" /> Select a test case from the table to view execution steps.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
