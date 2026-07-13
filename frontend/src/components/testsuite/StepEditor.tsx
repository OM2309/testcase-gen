'use client'

import React, { useState } from 'react'
import { Trash2, X, Check, Eye } from 'lucide-react'
import { Step } from '../../types'
import { InspectorModal } from './InspectorModal'

export const ACTIONS = [
  'goto', 'click', 'fill', 'select', 'check', 'uncheck', 'hover', 'press',
  'upload', 'waitFor', 'assertText', 'assertVisible', 'assertHidden', 'assertURLContains',
  'assertValue', 'assertCount', 'screenshot'
]

// Target "type" options for the guided dropdown. "custom" lets advanced users
// type a raw selector/target.
const TARGET_TYPES = [
  'input', 'button', 'link', 'text', 'checkbox', 'radio', 'select',
  'textarea', 'table', 'heading', 'label', 'placeholder', 'testid', 'toast', 'custom'
]

interface ActionCfg {
  /** whether this action needs a target element */
  target: 'required' | 'optional' | 'none'
  /** value field config, if the action uses one */
  value?: { label: string; placeholder: string }
  /** whether to offer the optional expected URL/text fields */
  expected?: boolean
}

// What each action needs — drives which fields the editor shows.
const ACTION_CONFIG: Record<string, ActionCfg> = {
  goto: { target: 'none', value: { label: 'URL / Path', placeholder: '/login' }, expected: true },
  click: { target: 'required', expected: true },
  fill: { target: 'required', value: { label: 'Value to type', placeholder: 'john@test.com' }, expected: true },
  select: { target: 'required', value: { label: 'Option', placeholder: 'India' }, expected: true },
  check: { target: 'required', expected: true },
  uncheck: { target: 'required', expected: true },
  hover: { target: 'required', expected: true },
  press: { target: 'optional', value: { label: 'Key', placeholder: 'Enter' }, expected: true },
  upload: { target: 'required', value: { label: 'Test file', placeholder: 'Select file...' }, expected: true },
  waitFor: { target: 'optional', value: { label: 'Timeout (ms)', placeholder: '1000' } },
  assertText: { target: 'none', value: { label: 'Expected text', placeholder: 'Task added' } },
  assertVisible: { target: 'required' },
  assertHidden: { target: 'required' },
  assertURLContains: { target: 'none', value: { label: 'URL contains', placeholder: '/dashboard' } },
  assertValue: { target: 'required', value: { label: 'Expected value', placeholder: 'john@test.com' } },
  assertCount: { target: 'required', value: { label: 'Expected count', placeholder: '3' } },
  screenshot: { target: 'none', value: { label: 'File name', placeholder: 'after-login.png' } }
}

function splitTarget(target: string): { type: string; name: string } {
  const i = (target || '').indexOf(':')
  if (i === -1) return { type: target ? 'custom' : 'input', name: target || '' }
  const type = target.slice(0, i)
  const name = target.slice(i + 1)
  return { type: TARGET_TYPES.includes(type) ? type : 'custom', name: type === '' ? name : (TARGET_TYPES.includes(type) ? name : target) }
}

function composeTarget(type: string, name: string): string {
  if (!name.trim()) return ''
  if (type === 'custom') return name.trim()
  return `${type}:${name.trim()}`
}

const inputCls =
  'w-full mt-1 px-2 py-1.5 text-xs bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/40'

/**
 * Guided, action-aware step editor. Shows only the fields relevant to the
 * chosen action, with a target-type dropdown + name instead of raw free text.
 */
export function StepEditor({ step, onSave, onCancel, onDelete }: {
  step: Step
  onSave: (patch: Partial<Step>) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const initial = splitTarget(step.target || '')
  const [action, setAction] = useState(step.action || 'click')
  const [targetType, setTargetType] = useState(initial.type)
  const [targetName, setTargetName] = useState(initial.name)
  const [value, setValue] = useState(step.value || '')
  const [description, setDescription] = useState(step.description || '')
  const [expectedUrl, setExpectedUrl] = useState(step.expected_url || '')
  const [expectedText, setExpectedText] = useState(step.expected_text || '')
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)

  const cfg = ACTION_CONFIG[action] || { target: 'optional' }
  const showTarget = cfg.target !== 'none'

  const save = () => {
    onSave({
      action,
      target: showTarget ? composeTarget(targetType, targetName) : '',
      value: cfg.value ? value : '',
      description,
      expected_url: cfg.expected ? expectedUrl.trim() : '',
      expected_text: cfg.expected ? expectedText.trim() : ''
    })
  }

  return (
    <div className="p-3 space-y-3 bg-primary/5 border border-primary/20 rounded-xl">
      <div className="grid grid-cols-2 gap-2">
        {/* Action */}
        <div>
          <label className="text-[10px] font-bold text-muted-foreground uppercase">Action</label>
          <select value={action} onChange={e => setAction(e.target.value)} className={inputCls}>
            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {cfg.value ? (
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase">{cfg.value.label}</label>
            {action === 'upload' ? (
              <div className="flex flex-col gap-1 mt-1">
                <input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const formData = new FormData()
                    formData.append('file', file)
                    try {
                      const { apiClient } = await import('../../services/apiClient')
                      const res = await apiClient.post('/upload/test-file', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                      })
                      if (res.data.success && res.data.data) {
                        setValue(res.data.data.filename)
                      }
                    } catch (err: any) {
                      alert('File upload failed: ' + err.response?.data?.message || err.message)
                    }
                  }}
                  className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                />
                {value && <span className="text-[10px] text-primary truncate max-w-[150px]">Uploaded: {value}</span>}
              </div>
            ) : (
              <input value={value} onChange={e => setValue(e.target.value)} placeholder={cfg.value.placeholder} className={inputCls} />
            )}
          </div>
        ) : <div />}
      </div>

      {/* Target: type dropdown + name */}
      {showTarget && (
        <div className="grid grid-cols-[130px_1fr] gap-2">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase">
              Target {cfg.target === 'optional' && <span className="text-muted-foreground/60">(opt)</span>}
            </label>
            <select value={targetType} onChange={e => setTargetType(e.target.value)} className={inputCls}>
              {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">
                {targetType === 'custom' ? 'Selector' : 'Label / name'}
              </label>
              <button
                type="button"
                onClick={() => setIsInspectorOpen(true)}
                className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-0.5"
              >
                <Eye className="w-3 h-3" /> Pick from Page
              </button>
            </div>
            <input
              value={targetName}
              onChange={e => setTargetName(e.target.value)}
              placeholder={targetType === 'custom' ? '#id, .class, css…' : 'e.g. Email, Create Account'}
              className={`${inputCls} font-mono`}
            />
          </div>
        </div>
      )}

      {/* Optional structured expectations */}
      {cfg.expected && (
        <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Expected URL</label>
            <input value={expectedUrl} onChange={e => setExpectedUrl(e.target.value)} placeholder="/dashboard (after this step)" className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Expected text</label>
            <input value={expectedText} onChange={e => setExpectedText(e.target.value)} placeholder="e.g. Welcome back" className={inputCls} />
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What this step does" className={inputCls} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <button onClick={onDelete} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-muted border border-border font-semibold">
          <Trash2 className="w-3 h-3 text-muted-foreground" /> Delete
        </button>
        <div className="flex gap-1.5">
          <button onClick={onCancel} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted font-semibold">
            <X className="w-3 h-3" /> Cancel
          </button>
          <button onClick={save} className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 font-semibold">
            <Check className="w-3 h-3" /> Save
          </button>
        </div>
      </div>

      <InspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        onSelect={(type, name) => {
          setTargetType(type)
          setTargetName(name)
        }}
      />
    </div>
  )
}

/** Read-only display of a step row. */
export function StepRow({ step }: { step: Step }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-[10px] font-bold text-muted-foreground">STEP {step.step_number}</span>
        <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-primary/10 text-primary border border-primary/20">{step.action}</span>
        {step.target && <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[140px]">{step.target}</span>}
        {step.value && <span className="text-[10px] font-mono text-muted-foreground/70 truncate max-w-[120px]">= {step.value}</span>}
      </div>
      {step.description && <p className="text-xs text-foreground">{step.description}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
        {step.expected_url && <span className="text-[10px] text-primary">→ url: {step.expected_url}</span>}
        {step.expected_text && <span className="text-[10px] text-primary">→ text: {step.expected_text}</span>}
        {!step.expected_url && !step.expected_text && step.expected && (
          <span className="text-[10px] text-primary">{step.expected}</span>
        )}
      </div>
    </div>
  )
}
