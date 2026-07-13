'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FileSpreadsheet, Plus, PlayCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

import { Step, TestCase } from '../types'
import { executionService } from '../services/executionService'
import { agentService } from '../services/agentService'
import { SuiteSummary } from './testsuite/SuiteSummary'
import { TestCaseList } from './testsuite/TestCaseList'
import { TestCaseDetail } from './testsuite/TestCaseDetail'
import { TestCaseDialogs, TestCaseForm } from './testsuite/TestCaseDialogs'
import { AiGenerateDialog } from './testsuite/AiGenerateDialog'
import { useProject } from '../contexts/ProjectContext'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function TestCasesView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const caseIdParam = searchParams.get('caseId')

  const {
    project,
    selectedSrsId,
    testSuites,
    refreshProject
  } = useProject()

  // Find active test suite for selected SRS
  const activeTestSuite = useMemo(() => {
    if (!selectedSrsId) return testSuites[0] || null
    return testSuites.find(t => t.srsDocumentId === selectedSrsId) || null
  }, [testSuites, selectedSrsId])

  const initialTestCases = useMemo(() => {
    return activeTestSuite?.testCases || []
  }, [activeTestSuite])

  const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedModule, setSelectedModule] = useState('All')
  const [search, setSearch] = useState('')
  const [modulesList, setModulesList] = useState<Array<{ name: string; count: number }>>([])

  // Keep state sync'd when initialTestCases change
  useEffect(() => {
    setTestCases(initialTestCases)
    if (initialTestCases.length > 0 && !selectedId) {
      setSelectedId(initialTestCases[0].id)
    }
  }, [initialTestCases])

  useEffect(() => {
    if (caseIdParam) {
      setSelectedId(caseIdParam)
      const tc = testCases.find(t => t.id === caseIdParam)
      if (tc) {
        setSelectedModule(tc.module || 'General')
      }
    }
  }, [caseIdParam, testCases])

  // Run execution dialog state
  const [isRunOpen, setIsRunOpen] = useState(false)
  const [runBaseUrl, setRunBaseUrl] = useState('http://localhost:3000')
  const [runHeadless, setRunHeadless] = useState(true)
  const [starting, setStarting] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
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

  // AI Generate Dialog States
  const [isChoiceOpen, setIsChoiceOpen] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  // Form State
  const [form, setFormState] = useState<TestCaseForm>({
    title: '', module: 'General', priority: 'Medium', scenarioType: 'positive', expectedResult: ''
  })
  const setForm = (patch: Partial<TestCaseForm>) => setFormState(f => ({ ...f, ...patch }))

  useEffect(() => {
    const map = new Map<string, number>()
    testCases.forEach(tc => map.set(tc.module || 'General', (map.get(tc.module || 'General') || 0) + 1))
    const list = Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
    const total = testCases.length
    const regressiveTotal = testCases.filter(tc => tc.isRegressive).length
    setModulesList([
      { name: 'All', count: total },
      ...list,
      { name: 'Regressive', count: regressiveTotal },
    ])
    if (testCases.length > 0 && !selectedId) setSelectedId(testCases[0].id)
  }, [testCases])

  const filteredTcs = testCases.filter(tc => {
    const matchModule = selectedModule === 'All'
      || (selectedModule === 'Regressive' && tc.isRegressive)
      || (tc.module || 'General') === selectedModule
    const matchSearch = !search || tc.title.toLowerCase().includes(search.toLowerCase())
    return matchModule && matchSearch
  })

  const selectedTc = testCases.find(tc => tc.id === selectedId) || null

  const handleExportExcel = useCallback(() => {
    if (!project) return
    try {
      const wb = XLSX.utils.book_new()

      const targetTestCases = selectedModule === 'All'
        ? testCases
        : testCases.filter(tc => (tc.module || 'General') === selectedModule)

      if (targetTestCases.length === 0) {
        toast.error('No test cases to export!')
        return
      }

      // Group test cases by module name
      const modulesMap = new Map<string, TestCase[]>()
      targetTestCases.forEach(tc => {
        const modName = tc.module || 'General'
        if (!modulesMap.has(modName)) {
          modulesMap.set(modName, [])
        }
        modulesMap.get(modName)!.push(tc)
      })

      modulesMap.forEach((cases, modName) => {
        const sheetData = cases.map(tc => ({
          'Test Case ID': tc.id,
          'Title': tc.title,
          'Description': tc.description || '',
          'Feature': tc.feature || '',
          'Priority': tc.priority,
          'Scenario Type': tc.scenario_type || '',
          'Expected Result': tc.expected_result || '',
          'Steps': tc.steps.map(s => `${s.step_number}. ${s.action} ${s.target || ''} ${s.value ? `(${s.value})` : ''}`).join('\n')
        }))

        const ws = XLSX.utils.json_to_sheet(sheetData)
        const cleanSheetName = modName
          .replace(/[:\\/?*\[\]]/g, '')
          .substring(0, 30) || 'General'

        XLSX.utils.book_append_sheet(wb, ws, cleanSheetName)
      })

      const fileName = selectedModule === 'All'
        ? `${project.projectName}_All_TestCases.xlsx`
        : `${project.projectName}_${selectedModule}_TestCases.xlsx`

      XLSX.writeFile(wb, fileName)
      toast.success('Excel file downloaded successfully! 📊')
    } catch (err: any) {
      console.error('Failed to export Excel:', err)
      toast.error('Failed to export Excel file.')
    }
  }, [testCases, selectedModule, project])

  const handleSave = async (updatedCases?: TestCase[]) => {
    if (!project || !activeTestSuite) return
    const targetCases = updatedCases || testCases
    try {
      setSaving(true)
      const res = await agentService.saveTestSuite(project._id, activeTestSuite._id, targetCases)
      if (res.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 1500)
        await refreshProject()
      }
    } catch (err) {
      console.error('Failed to save test suite', err)
    } finally {
      setSaving(false)
    }
  }

  const updateTestCase = useCallback((id: string, patch: Partial<TestCase>) => {
    setTestCases(prev => {
      const next = prev.map(tc => tc.id === id ? { ...tc, ...patch } : tc)
      handleSave(next)
      return next
    })
  }, [project, activeTestSuite])

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

  const handleStartRun = async () => {
    if (!project || !activeTestSuite) return
    setRunError(null)
    if (!/^https?:\/\//i.test(runBaseUrl.trim())) {
      setRunError('Base URL must start with http:// or https://')
      return
    }
    try {
      setStarting(true)
      let testCaseIds: string[] | undefined = undefined
      if (runTargetId) {
        testCaseIds = [runTargetId]
      } else if (selectedModule !== 'All') {
        testCaseIds = filteredTcs.map(tc => tc.id)
      }

      const res = await executionService.startExecution({
        projectId: project._id,
        testSuiteId: activeTestSuite._id,
        baseUrl: runBaseUrl.trim(),
        headless: runHeadless,
        testCaseIds
      })
      if (res.success) {
        setIsRunOpen(false)
        router.push(`/dashboard/${project._id}/execution?runId=${res.data.runId}`)
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

  const handleAiGenerated = (generatedTc: any) => {
    const newTc: TestCase = {
      id: generatedTc.id || `TC-${Date.now()}`,
      title: generatedTc.title || 'AI Generated Test Case',
      description: generatedTc.description || '',
      module: generatedTc.module || 'General',
      feature: generatedTc.feature || '',
      priority: generatedTc.priority || 'Medium',
      type: generatedTc.type || 'functional',
      scenario_type: generatedTc.scenario_type || 'positive',
      tags: generatedTc.tags || [],
      preconditions: generatedTc.preconditions || [],
      test_data: generatedTc.test_data || {},
      steps: (generatedTc.steps || []).map((s: any, idx: number) => ({
        step_number: s.step_number || idx + 1,
        action: s.action || 'click',
        target: s.target || '',
        value: s.value || '',
        description: s.description || '',
        expected: s.expected || '',
        expected_url: s.expected_url || '',
        expected_text: s.expected_text || ''
      })),
      expected_result: generatedTc.expected_result || '',
      cleanup_steps: generatedTc.cleanup_steps || [],
      source_requirements: generatedTc.source_requirements || []
    }
    const next = [...testCases, newTc]
    setTestCases(next)
    setSelectedId(newTc.id)
    handleSave(next)
    toast.success('AI generated test case added!')
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
    handleSave(next)
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
    handleSave(next)
  }

  const handleToggleRegressive = async (tcId: string) => {
    if (!project || !activeTestSuite) return
    try {
      const res = await agentService.toggleTestCaseRegressive(project._id, activeTestSuite._id, tcId)
      if (res.success) {
        await refreshProject()
      }
    } catch (err) {
      console.error('Failed to toggle regressive status', err)
    }
  }

  if (!project) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/20 text-xs text-muted-foreground">
        Project details not found.
      </div>
    )
  }

  if (!activeTestSuite) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/20 text-xs text-muted-foreground">
        Test suite not found. Run Agent 2 to generate one.
      </div>
    )
  }

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
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className={saveSuccess ? 'btn-secondary bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' : 'btn-secondary'}
          >
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={testCases.length === 0}
            className="btn-secondary"
            title={selectedModule === 'All' ? "Export all modules and test cases to Excel sheets" : `Export ${selectedModule} test cases to Excel`}
          >
            <FileSpreadsheet className="w-4 h-4 text-primary" /> Export Excel
          </button>
          <button
            onClick={() => setIsChoiceOpen(true)}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4" /> New Test Case
          </button>
          <button
            onClick={() => openRunDialog(null)}
            disabled={testCases.length === 0}
            className="btn-primary"
          >
            <PlayCircle className="w-4 h-4" /> Run Test Suite
          </button>
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
          onSelect={setSelectedId}
          search={search}
          onSearch={setSearch}
          onDelete={confirmDelete}
          onRun={openRunDialog}
          onToggleRegressive={handleToggleRegressive}
        />
      </div>

      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null) }}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto w-full p-6">
          <DialogHeader className="pb-4 border-b border-border mb-4">
            <DialogTitle className="text-lg font-bold text-foreground">
              {selectedTc ? `${selectedTc.id} — Details` : 'Test Case Details'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              View expected results, preconditions, and manage step definitions.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTc && (
            <TestCaseDetail
              testCase={selectedTc}
              onEditMeta={openEditDialog}
              onAddStep={() => { if (selectedTc) addStep(selectedTc.id) }}
              onDeleteStep={(idx) => { if (selectedTc) deleteStep(selectedTc.id, idx) }}
              onUpdateStep={(idx, patch) => { if (selectedTc) updateStep(selectedTc.id, idx, patch) }}
              onReorder={(from, to) => { if (selectedTc) reorderSteps(selectedTc.id, from, to) }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AiGenerateDialog
        open={isChoiceOpen}
        onOpenChange={setIsChoiceOpen}
        onManualCreate={openCreateDialog}
        onGenerated={handleAiGenerated}
        projectId={project?._id || ''}
        generating={aiGenerating}
        setGenerating={setAiGenerating}
      />
    </div>
  )
}
