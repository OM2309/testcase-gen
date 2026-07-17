'use client'

import React from 'react'
import { PlayCircle, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const fieldCls = 'px-3 py-2 bg-card border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary'

export interface TestCaseForm {
  title: string
  module: string
  priority: string
  scenarioType: string
  expectedResult: string
}

interface TestCaseDialogsProps {
  form: TestCaseForm
  setForm: (patch: Partial<TestCaseForm>) => void
  modules?: string[]
  // create
  createOpen: boolean
  setCreateOpen: (v: boolean) => void
  onCreate: () => void
  // edit
  editOpen: boolean
  setEditOpen: (v: boolean) => void
  onSaveEdit: () => void
  // delete
  deleteOpen: boolean
  setDeleteOpen: (v: boolean) => void
  onDelete: () => void
  // run
  runOpen: boolean
  setRunOpen: (v: boolean) => void
  runBaseUrl: string
  setRunBaseUrl: (v: string) => void
  runHeadless: boolean
  setRunHeadless: (v: boolean) => void
  starting: boolean
  runError: string | null
  runTargetId: string | null
  totalCount: number
  onStartRun: () => void
}

/** Small reusable metadata form used by both Create and Edit dialogs. */
function TestCaseFields({
  form,
  setForm,
  modules = []
}: {
  form: TestCaseForm
  setForm: (p: Partial<TestCaseForm>) => void
  modules?: string[]
}) {
  const [isCustomModule, setIsCustomModule] = React.useState(false)

  return (
    <div className="grid gap-4 py-4 text-xs">
      <div className="flex flex-col gap-1">
        <label className="font-semibold">Title</label>
        <input value={form.title} onChange={e => setForm({ title: e.target.value })} placeholder="Test case title" className={fieldCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-semibold">Module</label>
        {!isCustomModule && modules.length > 0 ? (
          <div className="flex gap-2">
            <select
              value={form.module}
              onChange={e => {
                if (e.target.value === '__new__') {
                  setIsCustomModule(true)
                  setForm({ module: '' })
                } else {
                  setForm({ module: e.target.value })
                }
              }}
              className={`${fieldCls} flex-grow h-9`}
            >
              {modules.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="__new__">+ Create New Module...</option>
            </select>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={form.module}
              onChange={e => setForm({ module: e.target.value })}
              placeholder="Enter module name"
              className={`${fieldCls} flex-grow h-9`}
            />
            {modules.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsCustomModule(false)
                  if (modules.length > 0) {
                    setForm({ module: modules[0] })
                  }
                }}
                className="px-2.5 py-1.5 border border-border bg-muted/40 hover:bg-secondary rounded-lg font-semibold text-[10px] select-none cursor-pointer"
              >
                Choose Existing
              </button>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-semibold">Priority</label>
          <select value={form.priority} onChange={e => setForm({ priority: e.target.value })} className={fieldCls}>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-semibold">Scenario Type</label>
          <select value={form.scenarioType} onChange={e => setForm({ scenarioType: e.target.value })} className={fieldCls}>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-semibold">Expected Result</label>
        <textarea value={form.expectedResult} onChange={e => setForm({ expectedResult: e.target.value })} placeholder="Expected outcome..." rows={2} className={`${fieldCls} resize-none`} />
      </div>
    </div>
  )
}

export function TestCaseDialogs(p: TestCaseDialogsProps) {
  return (
    <>
      {/* Create */}
      <Dialog open={p.createOpen} onOpenChange={p.setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Test Case</DialogTitle>
            <DialogDescription>Add a new test case to this suite.</DialogDescription>
          </DialogHeader>
          <TestCaseFields form={p.form} setForm={p.setForm} modules={p.modules} />
          <DialogFooter>
            <button onClick={() => p.setCreateOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-muted text-xs font-semibold">Cancel</button>
            <button onClick={p.onCreate} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90">Create</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={p.editOpen} onOpenChange={p.setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Test Case Details</DialogTitle>
            <DialogDescription>Modify metadata and validation params.</DialogDescription>
          </DialogHeader>
          <TestCaseFields form={p.form} setForm={p.setForm} modules={p.modules} />
          <DialogFooter>
            <button onClick={() => p.setEditOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-muted text-xs font-semibold">Cancel</button>
            <button onClick={p.onSaveEdit} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90">Save Changes</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={p.deleteOpen} onOpenChange={p.setDeleteOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Are you sure you want to permanently delete this test case? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => p.setDeleteOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-muted text-xs font-semibold">Cancel</button>
            <button onClick={p.onDelete} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-xs font-semibold hover:opacity-90">Delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run */}
      <Dialog open={p.runOpen} onOpenChange={p.setRunOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{p.runTargetId ? 'Run Test Case' : 'Run Test Suite'}</DialogTitle>
            <DialogDescription>
              {p.runTargetId
                ? 'Agent 3 will execute this single test case in a real browser using Playwright.'
                : `Agent 3 will execute all ${p.totalCount} test cases in a real browser using Playwright.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold">Base URL</label>
              <input value={p.runBaseUrl} onChange={e => p.setRunBaseUrl(e.target.value)} placeholder="http://localhost:3000" className={`${fieldCls} font-mono`} />
              <span className="text-[10px] text-muted-foreground">The app under test. `goto` steps are resolved relative to this URL.</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={p.runHeadless} onChange={e => p.setRunHeadless(e.target.checked)} className="w-4 h-4 accent-[var(--primary)]" />
              <span className="font-semibold">Run headless</span>
              <span className="text-[10px] text-muted-foreground">(no visible browser window)</span>
            </label>
            {p.runError && (
              <p className="text-[11px] text-rose-500 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">{p.runError}</p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => p.setRunOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-muted text-xs font-semibold">Cancel</button>
            <button onClick={p.onStartRun} disabled={p.starting} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:opacity-90 disabled:opacity-50">
              {p.starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
              {p.starting ? 'Starting...' : 'Start Execution'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
