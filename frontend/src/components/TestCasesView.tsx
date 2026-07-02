'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Info, ShieldCheck, FileSpreadsheet, HelpCircle, Plus, Trash2,
  GripVertical, Pencil, Check, X, ChevronDown, ChevronRight,
  FlaskConical, Search
} from 'lucide-react'

interface Step {
  step_number: number
  action: string
  target: string
  value: string
  description: string
  expected: string
}

interface TestCase {
  id: string
  title: string
  description: string
  module: string
  feature: string
  priority: string
  severity?: string
  type: string
  scenario_type?: string
  tags: string[]
  preconditions: string[]
  test_data: any
  steps: Step[]
  expected_result: string
  cleanup_steps: string[]
  source_requirements: any[]
}

interface TestCasesViewProps {
  testSuiteId: string
  testCases: TestCase[]
}

const ACTIONS = ['goto', 'click', 'fill', 'select', 'check', 'uncheck', 'hover', 'press',
  'waitFor', 'assertText', 'assertVisible', 'assertHidden', 'assertURLContains', 'assertValue', 'assertCount', 'screenshot']

export function TestCasesView({ testSuiteId, testCases: initialTestCases = [] }: TestCasesViewProps) {
  const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases)
  const [selectedId, setSelectedId] = useState<string | null>(initialTestCases[0]?.id || null)
  const [selectedModule, setSelectedModule] = useState('All')
  const [search, setSearch] = useState('')
  const [modulesList, setModulesList] = useState<Array<{ name: string; count: number }>>([])
  const [editingTcId, setEditingTcId] = useState<string | null>(null)
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null)
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  useEffect(() => {
    const map = new Map<string, number>()
    testCases.forEach(tc => map.set(tc.module || 'General', (map.get(tc.module || 'General') || 0) + 1))
    const list = Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    const total = testCases.length
    setModulesList([{ name: 'All', count: total }, ...list])
    if (testCases.length > 0 && !selectedId) setSelectedId(testCases[0].id)
  }, [testCases])

  const filteredTcs = testCases.filter(tc => {
    const matchModule = selectedModule === 'All' || (tc.module || 'General') === selectedModule
    const matchSearch = !search || tc.title.toLowerCase().includes(search.toLowerCase())
    return matchModule && matchSearch
  })

  const selectedTc = testCases.find(tc => tc.id === selectedId) || null

  // ---- Step Drag & Drop ----
  const handleStepDragStart = (idx: number) => setDraggedStepIdx(idx)
  const handleStepDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setDragOverIdx(idx)
  }
  const handleStepDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    if (draggedStepIdx === null || !selectedTc) return
    const steps = [...selectedTc.steps]
    const [moved] = steps.splice(draggedStepIdx, 1)
    steps.splice(dropIdx, 0, moved)
    const renumbered = steps.map((s, i) => ({ ...s, step_number: i + 1 }))
    updateTestCase(selectedTc.id, { steps: renumbered })
    setDraggedStepIdx(null)
    setDragOverIdx(null)
  }

  // ---- Test Case & Step CRUD ----
  const updateTestCase = useCallback((id: string, patch: Partial<TestCase>) => {
    setTestCases(prev => prev.map(tc => tc.id === id ? { ...tc, ...patch } : tc))
  }, [])

  const addStep = (tcId: string) => {
    const tc = testCases.find(t => t.id === tcId)
    if (!tc) return
    const newStep: Step = {
      step_number: tc.steps.length + 1,
      action: 'click',
      target: '',
      value: '',
      description: 'New step',
      expected: ''
    }
    updateTestCase(tcId, { steps: [...tc.steps, newStep] })
    setEditingStepIdx(tc.steps.length)
  }

  const deleteStep = (tcId: string, stepIdx: number) => {
    const tc = testCases.find(t => t.id === tcId)
    if (!tc) return
    const steps = tc.steps.filter((_, i) => i !== stepIdx).map((s, i) => ({ ...s, step_number: i + 1 }))
    updateTestCase(tcId, { steps })
    if (editingStepIdx === stepIdx) setEditingStepIdx(null)
  }

  const updateStep = (tcId: string, stepIdx: number, patch: Partial<Step>) => {
    const tc = testCases.find(t => t.id === tcId)
    if (!tc) return
    const steps = tc.steps.map((s, i) => i === stepIdx ? { ...s, ...patch } : s)
    updateTestCase(tcId, { steps })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Suite Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{testCases.length} test cases — edit steps, drag to reorder, create new cases</p>
        </div>
        <button
          onClick={() => {
            const newTc: TestCase = {
              id: `TC-${Date.now()}`,
              title: 'New Test Case',
              description: '',
              module: 'General',
              feature: '',
              priority: 'Medium',
              type: 'functional',
              scenario_type: 'positive',
              tags: [],
              preconditions: [],
              test_data: {},
              steps: [],
              expected_result: '',
              cleanup_steps: [],
              source_requirements: []
            }
            setTestCases(prev => [...prev, newTc])
            setSelectedId(newTc.id)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> New Test Case
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left — Module sidebar */}
        <div className="lg:col-span-2 space-y-1.5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2">Modules</h3>
          {modulesList.map(m => (
            <button
              key={m.name}
              onClick={() => setSelectedModule(m.name)}
              className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-between ${selectedModule === m.name ? 'bg-primary/10 text-primary border-l-[3px] border-primary pl-[10px]' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <span className="line-clamp-1">{m.name}</span>
              <span className="text-[10px] bg-border/60 px-1.5 py-0.5 rounded font-mono">{m.count}</span>
            </button>
          ))}
        </div>

        {/* Center — Test case list */}
        <div className="lg:col-span-4 border border-border rounded-xl bg-card overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/20">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search test cases..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="divide-y divide-border/60 max-h-[65vh] overflow-y-auto">
            {filteredTcs.map((tc) => (
              <div
                key={tc.id}
                onClick={() => setSelectedId(tc.id)}
                className={`group px-4 py-3 cursor-pointer transition-all hover:bg-muted/30 ${selectedId === tc.id ? 'bg-primary/5 border-l-[3px] border-primary pl-[13px]' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-primary flex-shrink-0">{tc.id}</span>
                      {getPriorityBadge(tc.priority)}
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1 line-clamp-2">{tc.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{tc.module} · {tc.steps.length} steps</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setTestCases(prev => prev.filter(t => t.id !== tc.id)); if (selectedId === tc.id) setSelectedId(null) }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filteredTcs.length === 0 && (
              <div className="py-12 text-center text-xs text-muted-foreground">No test cases found.</div>
            )}
          </div>
        </div>

        {/* Right — Step editor */}
        <div className="lg:col-span-6 border border-border rounded-xl bg-card/20 overflow-hidden">
          {selectedTc ? (
            <div className="flex flex-col max-h-[75vh] overflow-y-auto">
              {/* TC header with inline edit */}
              <div className="px-5 py-4 border-b border-border bg-card space-y-3 flex-shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editingTcId === selectedTc.id ? (
                      <input
                        autoFocus
                        defaultValue={selectedTc.title}
                        onBlur={e => { updateTestCase(selectedTc.id, { title: e.target.value }); setEditingTcId(null) }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                        className="w-full font-bold text-sm bg-muted/50 border border-primary/40 rounded-lg px-2 py-1 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-sm line-clamp-2">{selectedTc.title}</h2>
                        <button onClick={() => setEditingTcId(selectedTc.id)} className="p-1 rounded hover:bg-muted flex-shrink-0">
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[10px] font-mono font-bold text-primary">{selectedTc.id}</span>
                      {getPriorityBadge(selectedTc.priority)}
                      {selectedTc.scenario_type && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground border border-border">{selectedTc.scenario_type}</span>
                      )}
                    </div>
                  </div>
                </div>
                {selectedTc.expected_result && (
                  <div className="text-xs text-muted-foreground bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <span className="font-bold text-emerald-400 block text-[10px] uppercase mb-0.5">Expected Result</span>
                    {selectedTc.expected_result}
                  </div>
                )}
              </div>

              {/* Steps */}
              <div className="px-5 py-4 space-y-2 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Steps ({selectedTc.steps.length})
                  </h3>
                  <button
                    onClick={() => addStep(selectedTc.id)}
                    className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Step
                  </button>
                </div>

                {selectedTc.steps.length === 0 && (
                  <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No steps yet. Click "Add Step" to create the first one.
                  </div>
                )}

                {selectedTc.steps.map((step, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={() => handleStepDragStart(idx)}
                    onDragOver={e => handleStepDragOver(e, idx)}
                    onDrop={e => handleStepDrop(e, idx)}
                    className={`border rounded-xl transition-all ${dragOverIdx === idx ? 'border-primary bg-primary/5' : 'border-border bg-card'} ${draggedStepIdx === idx ? 'opacity-40' : ''}`}
                  >
                    {editingStepIdx === idx ? (
                      <StepEditor
                        step={step}
                        onSave={(patch) => { updateStep(selectedTc.id, idx, patch); setEditingStepIdx(null) }}
                        onCancel={() => setEditingStepIdx(null)}
                        onDelete={() => deleteStep(selectedTc.id, idx)}
                      />
                    ) : (
                      <div className="flex items-start gap-3 p-3 group/step">
                        <div className="cursor-grab active:cursor-grabbing mt-1" title="Drag to reorder">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-muted-foreground">STEP {step.step_number}</span>
                            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-primary/10 text-primary border border-primary/20">{step.action}</span>
                            {step.target && <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">{step.target}</span>}
                          </div>
                          <p className="text-xs text-foreground">{step.description}</p>
                          {step.expected && <p className="text-[10px] text-emerald-400 mt-1 border-t border-border/40 pt-1">{step.expected}</p>}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/step:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => setEditingStepIdx(idx)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteStep(selectedTc.id, idx)} className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Preconditions */}
                {selectedTc.preconditions?.length > 0 && (
                  <div className="pt-3 border-t border-border/40 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Preconditions
                    </span>
                    <ol className="pl-4 list-decimal text-xs text-muted-foreground space-y-0.5">
                      {selectedTc.preconditions.map((p, i) => <li key={i}>{p}</li>)}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground text-xs gap-3">
              <HelpCircle className="w-10 h-10 opacity-30" />
              <p>Select a test case to view and edit its steps</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StepEditor({ step, onSave, onCancel, onDelete }: {
  step: Step
  onSave: (patch: Partial<Step>) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [data, setData] = useState({ ...step })
  const set = (key: keyof Step, val: string) => setData(d => ({ ...d, [key]: val }))

  return (
    <div className="p-3 space-y-3 bg-primary/5 border-primary/30 rounded-xl">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Action</label>
          <select
            value={data.action}
            onChange={e => set('action', e.target.value)}
            className="w-full mt-1 px-2 py-1.5 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            {ACTIONS.map(a => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Target</label>
          <input
            value={data.target}
            onChange={e => set('target', e.target.value)}
            placeholder="e.g. button:Login"
            className="w-full mt-1 px-2 py-1.5 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40 font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Value</label>
          <input
            value={data.value}
            onChange={e => set('value', e.target.value)}
            placeholder="Input value or URL"
            className="w-full mt-1 px-2 py-1.5 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Expected</label>
          <input
            value={data.expected}
            onChange={e => set('expected', e.target.value)}
            placeholder="Expected outcome"
            className="w-full mt-1 px-2 py-1.5 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
        <input
          value={data.description}
          onChange={e => set('description', e.target.value)}
          placeholder="What this step does"
          className="w-full mt-1 px-2 py-1.5 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <button onClick={onDelete} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 font-semibold">
          <Trash2 className="w-3 h-3" /> Delete
        </button>
        <div className="flex gap-1.5">
          <button onClick={onCancel} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted font-semibold">
            <X className="w-3 h-3" /> Cancel
          </button>
          <button onClick={() => onSave(data)} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold">
            <Check className="w-3 h-3" /> Save
          </button>
        </div>
      </div>
    </div>
  )
}

function getPriorityBadge(priority: string) {
  const map: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    low: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  }
  const cls = map[(priority || '').toLowerCase()] || 'bg-muted text-muted-foreground border-border'
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase ${cls}`}>{priority || 'N/A'}</span>
}
