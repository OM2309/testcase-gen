'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, PlayCircle } from 'lucide-react'

import { Step, TestCase } from '../types'
import { executionService } from '../services/executionService'
import { SuiteSummary } from './testsuite/SuiteSummary'
import { TestCaseList } from './testsuite/TestCaseList'
import { TestCaseDetail } from './testsuite/TestCaseDetail'
import { TestCaseDialogs, TestCaseForm } from './testsuite/TestCaseDialogs'

interface TestCasesViewProps {
  projectId?: string
  testSuiteId: string
  testCases: TestCase[]
  onSave?: (testCases: TestCase[]) => Promise<void>
  onRunStarted?: (runId: string) => void
  selectedTestCaseId?: string | null
  onSelectTestCase?: (id: string | null) => void
}


export function TestCasesView({
  projectId,
  testSuiteId,
  testCases: initialTestCases = [],
  onSave,
  onRunStarted,
  selectedTestCaseId,
  onSelectTestCase
}: TestCasesViewProps) {
  const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(selectedTestCaseId || initialTestCases[0]?.id || null)
  const [selectedModule, setSelectedModule] = useState('All')
  const [search, setSearch] = useState('')
  const [modulesList, setModulesList] = useState<Array<{ name: string; count: number }>>([])

  useEffect(() => {
    if (selectedTestCaseId) {
      setSelectedId(selectedTestCaseId)
      const tc = testCases.find(t => t.id === selectedTestCaseId)
      if (tc) {
        setSelectedModule(tc.module || 'General')
      }
    }
  }, [selectedTestCaseId, testCases])

  // Run execution dialog state
  const [isRunOpen, setIsRunOpen] = useState(false)
  const [runBaseUrl, setRunBaseUrl] = useState('http://localhost:3000')
  const [runHeadless, setRunHeadless] = useState(true)
  const [starting, setStarting] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  // null = run the whole suite; otherwise run just this test case id
  const [runTargetId, setRunTargetId] = useState<string | null>(null)

  const openRunDialog = (id: string | null = null) => {
    setRunTargetId(id)
    setRunError(null)
    setIsRunOpen(true)
  }

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [tcToDelete, setTcToDelete] = useState<string | null>(null)

  // Form State (shared by create/edit dialogs)
  const [form, setFormState] = useState<TestCaseForm>({
    title: '', module: 'General', priority: 'Medium', scenarioType: 'positive', expectedResult: ''
  })
  const setForm = (patch: Partial<TestCaseForm>) => setFormState(f => ({ ...f, ...patch }))

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

  const updateTestCase = useCallback((id: string, patch: Partial<TestCase>) => {
    setTestCases(prev => {
      const next = prev.map(tc => tc.id === id ? { ...tc, ...patch } : tc)
      if (onSave) {
        setSaving(true)
        onSave(next).then(() => {
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 1500)
        }).catch(err => console.error('Auto-save failed', err))
          .finally(() => setSaving(false))
      }
      return next
    })
  }, [onSave])

  const reorderSteps = (tcId: string, from: number, to: number) => {
    const tc = testCases.find(t => t.id === tcId)
    if (!tc) return
    const steps = [...tc.steps]
    const [moved] = steps.splice(from, 1)
    steps.splice(to, 0, moved)
    updateTestCase(tcId, { steps: steps.map((s, i) => ({ ...s, step_number: i + 1 })) })
  }

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
  }

  const deleteStep = (tcId: string, stepIdx: number) => {
    const tc = testCases.find(t => t.id === tcId)
    if (!tc) return
    const steps = tc.steps.filter((_, i) => i !== stepIdx).map((s, i) => ({ ...s, step_number: i + 1 }))
    updateTestCase(tcId, { steps })
  }

  const updateStep = (tcId: string, stepIdx: number, patch: Partial<Step>) => {
    const tc = testCases.find(t => t.id === tcId)
    if (!tc) return
    const steps = tc.steps.map((s, i) => i === stepIdx ? { ...s, ...patch } : s)
    updateTestCase(tcId, { steps })
  }

  const handleSave = async () => {
    if (!onSave) return
    try {
      setSaving(true)
      await onSave(testCases)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Failed to save test suite', err)
    } finally {
      setSaving(false)
    }
  }

  const handleStartRun = async () => {
    if (!projectId || !testSuiteId) return
    setRunError(null)
    if (!/^https?:\/\//i.test(runBaseUrl.trim())) {
      setRunError('Base URL must start with http:// or https://')
      return
    }
    try {
      setStarting(true)
      const res = await executionService.startExecution({
        projectId,
        testSuiteId,
        baseUrl: runBaseUrl.trim(),
        headless: runHeadless,
        testCaseIds: runTargetId ? [runTargetId] : undefined
      })
      if (res.success) {
        setIsRunOpen(false)
        onRunStarted?.(res.runId)
      }
    } catch (err: any) {
      setRunError(err?.response?.data?.error || err?.message || 'Failed to start execution')
    } finally {
      setStarting(false)
    }
  }

  const openCreateDialog = () => {
    setFormState({ title: '', module: 'General', priority: 'Medium', scenarioType: 'positive', expectedResult: '' })
    setIsCreateOpen(true)
  }

  const handleCreateTestCase = () => {
    const newTc: TestCase = {
      id: `TC-${Date.now()}`,
      title: form.title || 'New Test Case',
      description: '',
      module: form.module,
      feature: '',
      priority: form.priority,
      type: 'functional',
      scenario_type: form.scenarioType,
      tags: [],
      preconditions: [],
      test_data: {},
      steps: [],
      expected_result: form.expectedResult,
      cleanup_steps: [],
      source_requirements: []
    }
    const next = [...testCases, newTc]
    setTestCases(next)
    setSelectedId(newTc.id)
    setIsCreateOpen(false)
    if (onSave) {
      setSaving(true)
      onSave(next).then(() => {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 1500)
      }).catch(err => console.error(err)).finally(() => setSaving(false))
    }
  }

  const openEditDialog = (tc: TestCase) => {
    setFormState({
      title: tc.title,
      module: tc.module || 'General',
      priority: tc.priority,
      scenarioType: tc.scenario_type || 'positive',
      expectedResult: tc.expected_result || ''
    })
    setIsEditOpen(true)
  }

  const handleSaveEdit = () => {
    if (!selectedTc) return
    updateTestCase(selectedTc.id, {
      title: form.title,
      module: form.module,
      priority: form.priority,
      scenario_type: form.scenarioType,
      expected_result: form.expectedResult
    })
    setIsEditOpen(false)
  }

  const confirmDelete = (id: string) => {
    setTcToDelete(id)
    setIsDeleteOpen(true)
  }

  const handleDeleteTestCase = () => {
    if (!tcToDelete) return
    const next = testCases.filter(t => t.id !== tcToDelete)
    setTestCases(next)
    if (selectedId === tcToDelete) {
      setSelectedId(next[0]?.id || null)
    }
    setIsDeleteOpen(false)
    setTcToDelete(null)
    if (onSave) {
      setSaving(true)
      onSave(next).then(() => {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 1500)
      }).catch(err => console.error(err)).finally(() => setSaving(false))
    }
  }

  // Aggregate stats for the summary strip

  return (
    <div className="flex flex-col gap-6">
      <TestCaseDialogs
        form={form}
        setForm={setForm}
        createOpen={isCreateOpen}
        setCreateOpen={setIsCreateOpen}
        onCreate={handleCreateTestCase}
        editOpen={isEditOpen}
        setEditOpen={setIsEditOpen}
        onSaveEdit={handleSaveEdit}
        deleteOpen={isDeleteOpen}
        setDeleteOpen={setIsDeleteOpen}
        onDelete={handleDeleteTestCase}
        runOpen={isRunOpen}
        setRunOpen={setIsRunOpen}
        runBaseUrl={runBaseUrl}
        setRunBaseUrl={setRunBaseUrl}
        runHeadless={runHeadless}
        setRunHeadless={setRunHeadless}
        starting={starting}
        runError={runError}
        runTargetId={runTargetId}
        totalCount={testCases.length}
        onStartRun={handleStartRun}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Suite Builder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{testCases.length} test cases — edit steps, drag to reorder, create new cases</p>
        </div>
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${saveSuccess ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'bg-card text-foreground hover:bg-muted border-border'}`}
            >
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-card text-foreground hover:bg-muted border border-border transition-colors"
          >
            <Plus className="w-4 h-4" /> New Test Case
          </button>
          {onRunStarted && (
            <button
              onClick={() => openRunDialog(null)}
              disabled={testCases.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlayCircle className="w-4 h-4" /> Run Test Suite
            </button>
          )}
        </div>
      </div>

      <SuiteSummary testCases={testCases} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <TestCaseList
          modules={modulesList}
          selectedModule={selectedModule}
          onSelectModule={setSelectedModule}
          testCases={filteredTcs}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id)
            onSelectTestCase?.(id)
          }}
          search={search}
          onSearch={setSearch}
          onDelete={confirmDelete}
          onRun={onRunStarted ? openRunDialog : undefined}
        />

        {/* Right — Step editor */}
        <TestCaseDetail
          testCase={selectedTc}
          onEditMeta={openEditDialog}
          onAddStep={() => { if (selectedTc) addStep(selectedTc.id) }}
          onDeleteStep={(idx) => { if (selectedTc) deleteStep(selectedTc.id, idx) }}
          onUpdateStep={(idx, patch) => { if (selectedTc) updateStep(selectedTc.id, idx, patch) }}
          onReorder={(from, to) => { if (selectedTc) reorderSteps(selectedTc.id, from, to) }}
        />
      </div>
    </div>
  )
}

