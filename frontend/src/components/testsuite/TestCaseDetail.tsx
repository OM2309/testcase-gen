'use client'

import React, { useState } from 'react'
import { ShieldCheck, FileSpreadsheet, HelpCircle, Plus, Trash2, GripVertical, Pencil } from 'lucide-react'
import { getPriorityBadge } from '../../helpers/utils'
import { Step, TestCase } from '../../types'
import { StepEditor, StepRow } from './StepEditor'

interface TestCaseDetailProps {
  testCase: TestCase | null
  onEditMeta: (tc: TestCase) => void
  onAddStep: () => void
  onDeleteStep: (idx: number) => void
  onUpdateStep: (idx: number, patch: Partial<Step>) => void
  onReorder: (from: number, to: number) => void
}

/** Right-hand panel: test case header + its editable, reorderable step list. */
export function TestCaseDetail({
  testCase, onEditMeta, onAddStep, onDeleteStep, onUpdateStep, onReorder
}: TestCaseDetailProps) {
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null)
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  if (!testCase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground text-xs gap-3">
        <HelpCircle className="w-10 h-10 opacity-30" />
        <p>Select a test case to view and edit its steps</p>
      </div>
    )
  }

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    if (draggedStepIdx !== null && draggedStepIdx !== dropIdx) onReorder(draggedStepIdx, dropIdx)
    setDraggedStepIdx(null)
    setDragOverIdx(null)
  }

  return (
    <div className="flex flex-col h-full">
        {/* TC header */}
        <div className="px-5 py-4 border-b border-border bg-card space-y-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm line-clamp-2">{testCase.title}</h2>
                <button onClick={() => onEditMeta(testCase)} className="p-1 rounded hover:bg-muted flex-shrink-0">
                  <Pencil className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[10px] font-mono font-bold text-[#FF6B00]">{testCase.id}</span>
                {getPriorityBadge(testCase.priority)}
                {testCase.scenario_type && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground border border-border">{testCase.scenario_type}</span>
                )}
              </div>
            </div>
          </div>
          {testCase.expected_result && (
            <div className="text-xs text-muted-foreground bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
              <span className="font-bold text-emerald-400 block text-[10px] uppercase mb-0.5">Expected Result</span>
              {testCase.expected_result}
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-2 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#FF6B00]" /> Steps ({testCase.steps.length})
            </h3>
            <button
              onClick={onAddStep}
              className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20 hover:bg-[#FF6B00]/20 transition-colors font-semibold"
            >
              <Plus className="w-3 h-3" /> Add Step
            </button>
          </div>

          {testCase.steps.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No steps yet. Click &quot;Add Step&quot; to create the first one.
            </div>
          )}

          {testCase.steps.map((step, idx) => (
            <div
              key={idx}
              draggable
              onDragStart={() => setDraggedStepIdx(idx)}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
              onDrop={e => handleDrop(e, idx)}
              className={`border rounded-xl transition-all ${dragOverIdx === idx ? 'border-[#FF6B00] bg-[#FF6B00]/5' : 'border-border bg-card'} ${draggedStepIdx === idx ? 'opacity-40' : ''}`}
            >
              {editingStepIdx === idx ? (
                <StepEditor
                  step={step}
                  onSave={(patch) => { onUpdateStep(idx, patch); setEditingStepIdx(null) }}
                  onCancel={() => setEditingStepIdx(null)}
                  onDelete={() => { onDeleteStep(idx); setEditingStepIdx(null) }}
                />
              ) : (
                <div className="flex items-start gap-3 p-3 group/step">
                  <div className="cursor-grab active:cursor-grabbing mt-1" title="Drag to reorder">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </div>
                  <StepRow step={step} />
                  <div className="flex items-center gap-1 opacity-0 group-hover/step:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => setEditingStepIdx(idx)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => onDeleteStep(idx)} className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {testCase.preconditions?.length > 0 && (
            <div className="pt-3 border-t border-border/40 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Preconditions
              </span>
              <ol className="pl-4 list-decimal text-xs text-muted-foreground space-y-0.5">
                {testCase.preconditions.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            </div>
          )}
        </div>
      </div>
  )
}
