'use client'

import React, { useState } from 'react'
import { ShieldCheck, FileSpreadsheet, HelpCircle, Plus, Trash2, GripVertical, Pencil, Play, Sparkles, Upload, X, Loader2, AlertTriangle, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { getPriorityBadge } from '../../helpers/utils'
import { Step, TestCase, RejectionFeedbackItem } from '../../types'
import { StepEditor, StepRow } from './StepEditor'
import { agentService } from '../../services/agentService'

interface TestCaseDetailProps {
  testCase: TestCase | null
  projectId: string
  onEditMeta: (tc: TestCase) => void
  onAddStep: () => void
  onDeleteStep: (idx: number) => void
  onUpdateStep: (idx: number, patch: Partial<Step>) => void
  onReorder: (from: number, to: number) => void
  onUpdateTestCase: (patch: Partial<TestCase>) => void
  rejectionFeedback?: RejectionFeedbackItem
  onResolveRejection?: (testCaseId: string, action: 'rejected_change' | 'manually_updated') => void
  onAiResolveRejection?: (testCaseId: string) => void
  isResolvingFeedback?: boolean
  isAiResolvingFeedback?: boolean
}

/** Right-hand panel: test case header + its editable, reorderable step list. */
export function TestCaseDetail({
  testCase, projectId, onEditMeta, onAddStep, onDeleteStep, onUpdateStep, onReorder, onUpdateTestCase,
  rejectionFeedback, onResolveRejection, onAiResolveRejection, isResolvingFeedback, isAiResolvingFeedback
}: TestCaseDetailProps) {
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null)
  const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // AI Step Modifier States
  const [showAiPanel, setShowAiPanel] = useState(false)
  const [aiInstructions, setAiInstructions] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null)
  const [aiUpdating, setAiUpdating] = useState(false)

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setScreenshotFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshotBase64(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAiUpdate = async () => {
    if (!aiInstructions.trim()) return
    setAiUpdating(true)
    try {
      const payload = {
        testCase: {
          title: testCase.title,
          expected_result: testCase.expected_result,
          preconditions: testCase.preconditions,
          steps: testCase.steps
        },
        instructions: aiInstructions,
        screenshot: screenshotBase64
      }

      const res = await agentService.aiUpdateTestCaseSteps(projectId, payload)
      if (res.success && res.data) {
        const updated = res.data
        
        // Map backend response keys (snake_case/camelCase check)
        const newSteps = (updated.steps || []).map((s: any, idx: number) => ({
          step_number: s.step_number || s.stepNumber || idx + 1,
          action: s.action || '',
          target: s.target || s.selector || '',
          value: s.value || '',
          description: s.description || '',
          expected: s.expected || ''
        }))

        onUpdateTestCase({
          expected_result: updated.expected_result || testCase.expected_result,
          preconditions: updated.preconditions || testCase.preconditions,
          steps: newSteps
        })

        toast.success('Test case steps updated by AI successfully! ✨')
        setAiInstructions('')
        setScreenshotFile(null)
        setScreenshotBase64(null)
        setShowAiPanel(false)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'AI failed to update test case steps.')
    } finally {
      setAiUpdating(false)
    }
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
                <span className="text-[10px] font-mono font-bold text-primary">{testCase.id}</span>
                {getPriorityBadge(testCase.priority)}
                {testCase.scenario_type && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground border border-border">{testCase.scenario_type}</span>
                )}
              </div>
            </div>
          </div>
          {testCase.expected_result && (
            <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              <span className="font-bold text-primary block text-[10px] uppercase mb-0.5">Expected Result</span>
              {testCase.expected_result}
            </div>
          )}

          {/* PM Rejection Feedback Banner */}
          {rejectionFeedback && (
            <div className="border border-rose-500/30 bg-rose-500/5 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-[10px] font-bold text-rose-500 uppercase">PM Feedback</span>
              </div>
              <p className="text-xs text-muted-foreground">{rejectionFeedback.feedback}</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onResolveRejection?.(testCase.id, 'rejected_change')}
                  disabled={isResolvingFeedback}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all font-semibold"
                >
                  <Ban className="w-3 h-3" /> Reject Change
                </button>
                <button
                  onClick={() => onAiResolveRejection?.(testCase.id)}
                  disabled={isAiResolvingFeedback}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all font-semibold"
                >
                  {isAiResolvingFeedback ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Update
                </button>
                <button
                  onClick={() => {
                    onEditMeta(testCase)
                    onResolveRejection?.(testCase.id, 'manually_updated')
                  }}
                  disabled={isResolvingFeedback}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all font-semibold"
                >
                  <Pencil className="w-3 h-3" /> Edit Manually
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-2 flex-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Steps ({testCase.steps.length})
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAiPanel(prev => !prev)}
                className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border transition-all font-semibold cursor-pointer ${
                  showAiPanel 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-card text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                <Sparkles className="w-3 h-3" /> AI Update Steps
              </button>
              <button
                onClick={onAddStep}
                className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-semibold"
              >
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>
          </div>

          {showAiPanel && (
            <div className="border border-primary/20 bg-primary/5 rounded-xl p-4 space-y-3.5 mb-4 text-xs">
              <div className="flex items-center justify-between border-b border-primary/10 pb-1.5">
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Modify Steps with AI
                </span>
                <button onClick={() => setShowAiPanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Describe your modifications</label>
                <textarea
                  value={aiInstructions}
                  onChange={e => setAiInstructions(e.target.value)}
                  placeholder="e.g. 'Update login password value to TestPassword123' or 'Insert step to click on Forgot Password'"
                  rows={3}
                  className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:outline-none focus:border-primary text-xs resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground block">UI Screenshot (optional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="ai-screenshot-upload"
                    />
                    <label
                      htmlFor="ai-screenshot-upload"
                      className="flex items-center gap-1.5 px-3 py-2 border border-border bg-card rounded-lg hover:bg-muted/80 cursor-pointer text-[11px] font-semibold text-foreground select-none"
                    >
                      <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                      {screenshotFile ? 'Change Image' : 'Upload Screenshot'}
                    </label>
                    {screenshotFile && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {screenshotFile.name}
                      </span>
                    )}
                  </div>
                </div>
                {screenshotBase64 && (
                  <div className="relative w-20 h-14 rounded border border-border/80 overflow-hidden bg-muted flex items-center justify-center self-end">
                    <img src={screenshotBase64} alt="Preview" className="max-w-full max-h-full object-contain" />
                    <button 
                      onClick={() => { setScreenshotFile(null); setScreenshotBase64(null) }}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 text-white rounded-full hover:bg-black"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-primary/10">
                <button
                  type="button"
                  onClick={() => setShowAiPanel(false)}
                  className="btn-secondary h-8 text-[11px] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAiUpdate}
                  disabled={aiUpdating || !aiInstructions.trim()}
                  className="btn-primary h-8 text-[11px] font-semibold flex items-center gap-1.5"
                >
                  {aiUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
                  Update Steps
                </button>
              </div>
            </div>
          )}

          {testCase.steps.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              No steps yet. Click &quot;Add Step&quot; to create the first one.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testCase.steps.map((step, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={() => setDraggedStepIdx(idx)}
                onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
                onDrop={e => handleDrop(e, idx)}
                className={`border rounded-xl transition-all ${dragOverIdx === idx ? 'border-primary bg-primary/5' : 'border-border bg-card'} ${draggedStepIdx === idx ? 'opacity-40' : ''}`}
              >
                {editingStepIdx === idx ? (
                  <StepEditor
                    step={step}
                    onSave={(patch) => { onUpdateStep(idx, patch); setEditingStepIdx(null) }}
                    onCancel={() => setEditingStepIdx(null)}
                    onDelete={() => { onDeleteStep(idx); setEditingStepIdx(null) }}
                  />
                ) : (
                  <div className="flex items-start gap-3 p-3 group/step relative">
                    <div className="flex items-center gap-1 mt-1 flex-shrink-0">
                      <div className="cursor-grab active:cursor-grabbing" title="Drag to reorder">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toast.success(`Running simulation for step ${idx + 1}: ${step.action}`)
                        }}
                        className="p-1 rounded hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                        title="Simulate step execution"
                      >
                        <Play className="w-3 h-3 text-primary fill-primary/10" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <StepRow step={step} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/step:opacity-100 transition-opacity flex-shrink-0 self-start">
                      <button onClick={() => setEditingStepIdx(idx)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => onDeleteStep(idx)} className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {testCase.preconditions?.length > 0 && (
            <div className="pt-3 border-t border-border/40 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Preconditions
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
