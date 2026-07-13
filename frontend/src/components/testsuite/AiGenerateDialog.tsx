'use client'

import React, { useState } from 'react'
import { Sparkles, PenTool, Loader2, ArrowLeft } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const fieldCls = 'px-3 py-2 bg-card border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary'

interface AiGenerateDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onManualCreate: () => void
  onGenerated: (testCase: any) => void
  projectId: string
  generating: boolean
  setGenerating: (v: boolean) => void
}

export function AiGenerateDialog({
  open,
  onOpenChange,
  onManualCreate,
  onGenerated,
  projectId,
  generating,
  setGenerating,
}: AiGenerateDialogProps) {
  const [screen, setScreen] = useState<'choice' | 'ai'>('choice')
  const [requirement, setRequirement] = useState('')
  const [module, setModule] = useState('General')
  const [priority, setPriority] = useState('Medium')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setScreen('choice')
    setRequirement('')
    setModule('General')
    setPriority('Medium')
    setError(null)
  }

  const handleClose = (v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }

  const handleManual = () => {
    reset()
    onOpenChange(false)
    onManualCreate()
  }

  const handleGenerate = async () => {
    if (!requirement.trim()) {
      setError('Please describe your test scenario.')
      return
    }
    setError(null)
    setGenerating(true)
    try {
      const { agentService } = await import('../../services/agentService')
      const res = await agentService.aiGenerateTestCase(projectId, requirement.trim(), module, priority)
      if (res.success && res.data) {
        onGenerated(res.data)
        handleClose(false)
      } else {
        setError('AI returned an unexpected response. Please try again.')
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to generate test case.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {screen === 'choice' ? (
          <>
            <DialogHeader>
              <DialogTitle>New Test Case</DialogTitle>
              <DialogDescription>Choose how you'd like to create your test case.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
              {/* Manual */}
              <button
                onClick={handleManual}
                className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <PenTool className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-foreground">Create Manually</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Define steps yourself</span>
                </div>
              </button>
              {/* AI */}
              <button
                onClick={() => setScreen('ai')}
                className="group flex flex-col items-center gap-3 p-5 rounded-xl border border-border hover:border-violet-500/50 hover:bg-violet-500/5 transition-all cursor-pointer text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-violet-500/10 transition-colors">
                  <Sparkles className="w-5 h-5 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                </div>
                <div>
                  <span className="block text-sm font-semibold text-foreground">Generate with AI</span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">Describe in plain English</span>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button onClick={() => setScreen('choice')} className="p-1 rounded hover:bg-muted transition-colors" disabled={generating}>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div>
                  <DialogTitle className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-500" /> Generate with AI
                  </DialogTitle>
                  <DialogDescription>Describe your test scenario and AI will generate the Playwright steps.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold">Requirement <span className="text-rose-500">*</span></label>
                <textarea
                  value={requirement}
                  onChange={e => setRequirement(e.target.value)}
                  placeholder="e.g. Login with valid credentials, verify redirect to dashboard, check welcome toast message appears"
                  rows={4}
                  className={`${fieldCls} resize-none`}
                  disabled={generating}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">Module</label>
                  <input value={module} onChange={e => setModule(e.target.value)} placeholder="General" className={fieldCls} disabled={generating} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold">Priority</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} className={fieldCls} disabled={generating}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              {error && (
                <p className="text-[11px] text-rose-500 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
            <DialogFooter>
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 border rounded-xl hover:bg-muted text-xs font-semibold"
                disabled={generating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || !requirement.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generating ? 'Generating...' : 'Generate Test Case'}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
