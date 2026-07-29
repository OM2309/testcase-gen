'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FileSpreadsheet, Plus, PlayCircle, ShieldCheck, MessageSquare, Send, Clock, ThumbsUp, ThumbsDown, AlertTriangle, Sparkles, X, Loader2, Pencil, Ban, ChevronDown, FileText, Check } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

import { Step, TestCase, RejectionFeedbackItem } from '../types'
import { SuiteSummary } from './testsuite/SuiteSummary'
import { TestCaseList } from './testsuite/TestCaseList'
import { TestCaseDetail } from './testsuite/TestCaseDetail'
import { TestCaseDialogs, TestCaseForm } from './testsuite/TestCaseDialogs'
import { AiGenerateDialog } from './testsuite/AiGenerateDialog'
import { useProject } from '../contexts/ProjectContext'
import {
  useSaveTestSuiteMutation,
  useToggleRegressiveMutation,
  useRequestApprovalMutation,
  useReviewTestSuiteMutation,
  useResolveRejectionFeedbackMutation,
  useAiResolveRejectionFeedbackMutation,
} from '../mutations/agent.mutation'
import { useStartExecutionMutation } from '../mutations/execution.mutation'
import { EmptyState } from '@/components/shared'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function TestCasesView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const caseIdParam = searchParams.get('caseId')
  const srsIdParam = searchParams.get('srsId')

  const {
    project,
    selectedSrsId,
    setSelectedSrsId,
    testSuites,
  } = useProject()

  // Sync srsId from URL into the context so the correct SRS test suite is shown
  useEffect(() => {
    if (srsIdParam && srsIdParam !== selectedSrsId) {
      setSelectedSrsId(srsIdParam)
    }
  }, [srsIdParam, selectedSrsId, setSelectedSrsId])

  // SRS documents list for the selector
  const srsDocs = useMemo(() => project?.srsDocuments || [], [project?.srsDocuments])
  const hasMultipleSrs = srsDocs.length > 1
  const [srsDropdownOpen, setSrsDropdownOpen] = useState(false)

  // Find active test suite for selected SRS
  const activeTestSuite = useMemo(() => {
    // Map virtual IDs to null for backend lookup
    const mappedId = selectedSrsId
      ? (selectedSrsId === 'figma-design' || selectedSrsId === 'legacy') ? null : selectedSrsId
      : null

    if (selectedSrsId) {
      return testSuites.find(t => t.srsDocumentId === mappedId) || null
    }

    // When no SRS is selected: if there's only one suite, use it; otherwise require explicit selection
    if (testSuites.length === 1) return testSuites[0]
    if (srsDocs.length <= 1) return testSuites[0] || null
    // Multiple SRS docs exist but none selected — don't silently pick the first one
    return null
  }, [testSuites, selectedSrsId, srsDocs.length])

  // Get the display name for the currently selected SRS
  const activeSrsName = useMemo(() => {
    if (!selectedSrsId) return srsDocs.length > 0 ? srsDocs[0]?.originalFileName : 'Test Suite'
    if (selectedSrsId === 'figma-design') return 'Figma Designs'
    if (selectedSrsId === 'legacy') return 'Legacy Document'
    const doc = srsDocs.find(d => d._id === selectedSrsId)
    return doc?.originalFileName || 'Test Suite'
  }, [selectedSrsId, srsDocs])

  // Helper to get approval status for a given SRS doc
  const getApprovalStatusForSrs = useCallback((srsId: string) => {
    const mappedId = (srsId === 'figma-design' || srsId === 'legacy') ? null : srsId
    const suite = testSuites.find(t => t.srsDocumentId === mappedId)
    return suite?.approvalStatus || 'draft'
  }, [testSuites])

  // Handle SRS selection from the dropdown
  const handleSrsSelect = useCallback((srsId: string) => {
    setSelectedSrsId(srsId)
    setSrsDropdownOpen(false)
    // Update URL to reflect the selected SRS
    const url = new URL(window.location.href)
    url.searchParams.set('srsId', srsId)
    router.replace(url.pathname + url.search)
  }, [setSelectedSrsId, router])

  const initialTestCases = useMemo(() => {
    return activeTestSuite?.testCases || []
  }, [activeTestSuite])

  const [testCases, setTestCases] = useState<TestCase[]>(initialTestCases)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedModule, setSelectedModule] = useState('All')
  const [search, setSearch] = useState('')
  const [modulesList, setModulesList] = useState<Array<{ name: string; count: number }>>([])

  // Session & Roles
  const { data: session } = useSession()
  const userRole = (session as any)?.user?.role
  const isQA = userRole === 'qa' || userRole === 'developer'
  const isPM = userRole === 'project_manager' || userRole === 'admin'

  // Review dialog states
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved')
  const [reviewComment, setReviewComment] = useState('')
  // Per-test-case rejection feedback state
  const [selectedRejectTcIds, setSelectedRejectTcIds] = useState<Set<string>>(new Set())
  const [rejectFeedbackMap, setRejectFeedbackMap] = useState<Record<string, string>>({})

  // Mutations
  const saveSuiteMutation = useSaveTestSuiteMutation(project?._id || '')
  const toggleRegressiveMutation = useToggleRegressiveMutation(project?._id || '')
  const startExecutionMutation = useStartExecutionMutation()
  const requestApprovalMutation = useRequestApprovalMutation(project?._id || '')
  const reviewTestSuiteMutation = useReviewTestSuiteMutation(project?._id || '')
  const resolveRejectionFeedbackMutation = useResolveRejectionFeedbackMutation(project?._id || '')
  const aiResolveRejectionFeedbackMutation = useAiResolveRejectionFeedbackMutation(project?._id || '')

  // Derived: is suite approved?
  const isApproved = activeTestSuite?.approvalStatus === 'approved'
  // Pending rejection feedback items
  const pendingFeedback = useMemo(() => {
    return (activeTestSuite?.rejectionFeedback || []).filter(f => f.resolvedByAction === 'pending')
  }, [activeTestSuite?.rejectionFeedback])

  const existingModules = useMemo(() => {
    return modulesList
      .map(m => m.name)
      .filter(name => name !== 'All' && name !== 'Regressive')
  }, [modulesList])

  // Keep state sync'd when initialTestCases change
  useEffect(() => {
    setTestCases(initialTestCases)
    if (initialTestCases.length > 0 && !selectedId) {
      setSelectedId(null)
    }
  }, [initialTestCases])

  useEffect(() => {
    if (caseIdParam && testCases.length > 0) {
      const tc = testCases.find(t => t.id === caseIdParam)
      if (tc) {
        setSelectedModule(tc.module || 'General')
        setSelectedId(caseIdParam)
      }
    }
  }, [caseIdParam, testCases])

  // Run execution dialog state
  const [isRunOpen, setIsRunOpen] = useState(false)
  const [runBaseUrl, setRunBaseUrl] = useState('http://localhost:3000')
  const [runHeadless, setRunHeadless] = useState(true)
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
      { name: 'Regression', count: regressiveTotal },
    ])
    if (testCases.length > 0 && !selectedId) setSelectedId(null)
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
    saveSuiteMutation.mutate(
      { suiteId: activeTestSuite._id, testCases: targetCases },
      {
        onSuccess: () => {
          setSaveSuccess(true)
          setTimeout(() => setSaveSuccess(false), 1500)
        },
      }
    )
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

    let testCaseIds: string[] | undefined = undefined
    if (runTargetId) {
      testCaseIds = [runTargetId]
    } else if (selectedModule !== 'All') {
      testCaseIds = filteredTcs.map(tc => tc.id)
    }

    startExecutionMutation.mutate(
      {
        projectId: project._id,
        testSuiteId: activeTestSuite._id,
        baseUrl: runBaseUrl.trim(),
        headless: runHeadless,
        testCaseIds,
      },
      {
        onSuccess: (res) => {
          if (res.success) {
            setIsRunOpen(false)
            router.push(`/dashboard/${project._id}/execution?runId=${res.data.runId}`)
          }
        },
        onError: (err: any) => {
          setRunError(err?.response?.data?.error || err?.message || 'Failed to start execution')
        },
      }
    )
  }

  const handleRequestApproval = () => {
    if (!activeTestSuite) return
    requestApprovalMutation.mutate(activeTestSuite._id)
  }

  const handleReviewSubmit = () => {
    if (!activeTestSuite) return
    // For approval, no special validation needed
    // For rejection, need at least one test case selected with feedback
    if (reviewStatus === 'rejected' && selectedRejectTcIds.size === 0) {
      toast.error('Please select at least one test case and provide feedback.')
      return
    }

    const rejectedTestCases = reviewStatus === 'rejected'
      ? Array.from(selectedRejectTcIds)
          .filter(id => rejectFeedbackMap[id]?.trim())
          .map(id => ({ testCaseId: id, feedback: rejectFeedbackMap[id].trim() }))
      : []

    if (reviewStatus === 'rejected' && rejectedTestCases.length === 0) {
      toast.error('Please provide feedback for at least one selected test case.')
      return
    }

    reviewTestSuiteMutation.mutate(
      {
        suiteId: activeTestSuite._id,
        status: reviewStatus,
        comment: reviewComment.trim(),
        rejectedTestCases,
      },
      {
        onSuccess: () => {
          setIsReviewOpen(false)
          setReviewComment('')
          setSelectedRejectTcIds(new Set())
          setRejectFeedbackMap({})
        },
      }
    )
  }

  const handleResolveRejection = (testCaseId: string, action: 'rejected_change' | 'manually_updated') => {
    if (!activeTestSuite) return
    resolveRejectionFeedbackMutation.mutate({
      suiteId: activeTestSuite._id,
      testCaseId,
      action,
    })
  }

  const handleAiResolveRejection = (testCaseId: string) => {
    if (!activeTestSuite) return
    aiResolveRejectionFeedbackMutation.mutate({
      suiteId: activeTestSuite._id,
      testCaseId,
    })
  }

  const toggleRejectTcSelection = (tcId: string) => {
    setSelectedRejectTcIds(prev => {
      const next = new Set(prev)
      if (next.has(tcId)) {
        next.delete(tcId)
      } else {
        next.add(tcId)
      }
      return next
    })
  }

  const openCreateDialog = (moduleName?: string) => {
    setFormState({ title: '', module: moduleName || 'General', priority: 'Medium', scenarioType: 'positive', expectedResult: '' })
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

  const handleToggleRegressive = (tcId: string) => {
    if (!project || !activeTestSuite) return
    toggleRegressiveMutation.mutate({ suiteId: activeTestSuite._id, testCaseId: tcId })
  }

  if (!project) {
    return <EmptyState icon={ShieldCheck} title="Project details not found." />
  }

  if (!activeTestSuite) {
    if (hasMultipleSrs && !selectedSrsId) {
      return <EmptyState icon={FileText} title="Select an SRS document to view its test suite." description="This project has multiple SRS documents. Please select one from the modules page to view its test suite and approval status." />
    }
    return <EmptyState icon={ShieldCheck} title="Test suite not found. Run Agent 2 to generate one." />
  }

  const getApprovalBadge = () => {
    const status = activeTestSuite?.approvalStatus || 'draft'
    switch (status) {
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Clock className="w-3.5 h-3.5" /> Changes Requested
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-muted text-muted-foreground border border-border">
            Draft
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <TestCaseDialogs
        form={form}
        setForm={setForm}
        modules={existingModules}
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
        starting={startExecutionMutation.isPending}
        runError={runError}
        runTargetId={runTargetId}
        totalCount={testCases.length}
        onStartRun={handleStartRun}
      />

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className={`p-6 ${reviewStatus === 'rejected' ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
          <DialogHeader className="pb-4 border-b border-border mb-4">
            <DialogTitle className="text-lg font-bold text-foreground">
              Review Test Suite
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Approve or request changes for this test suite. When requesting changes, select the specific test cases and provide feedback for each.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setReviewStatus('approved')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl font-semibold transition-all cursor-pointer ${reviewStatus === 'approved'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                <ThumbsUp className="w-4 h-4" /> Approve
              </button>
              <button
                type="button"
                onClick={() => setReviewStatus('rejected')}
                className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl font-semibold transition-all cursor-pointer ${reviewStatus === 'rejected'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-500 shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                <ThumbsDown className="w-4 h-4" /> Request Changes
              </button>
            </div>

            {/* Per-test-case feedback when rejecting */}
            {reviewStatus === 'rejected' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Select test cases with issues <span className="text-rose-500">*</span>
                </label>
                <div className="max-h-[40vh] overflow-y-auto border border-border rounded-xl divide-y divide-border/60">
                  {testCases.map(tc => {
                    const isSelected = selectedRejectTcIds.has(tc.id)
                    return (
                      <div key={tc.id} className={`p-3 transition-all ${isSelected ? 'bg-rose-500/5' : 'hover:bg-muted/30'}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRejectTcSelection(tc.id)}
                            className="w-3.5 h-3.5 text-rose-500 border-border rounded focus:ring-rose-500/40 bg-background cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-primary mr-2">{tc.id}</span>
                            <span className="text-xs font-medium text-foreground">{tc.title}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="mt-2 ml-7">
                            <textarea
                              value={rejectFeedbackMap[tc.id] || ''}
                              onChange={(e) => setRejectFeedbackMap(prev => ({ ...prev, [tc.id]: e.target.value }))}
                              placeholder={`What needs to change in ${tc.id}?`}
                              rows={2}
                              className="w-full px-3 py-2 text-xs bg-card border border-rose-500/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/40 focus:border-rose-500 transition-all resize-none placeholder:text-muted-foreground"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {selectedRejectTcIds.size > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    {selectedRejectTcIds.size} test case{selectedRejectTcIds.size !== 1 ? 's' : ''} selected for feedback
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="review-comment" className="text-xs font-semibold text-foreground">
                Overall Comments {reviewStatus === 'approved' && <span className="text-muted-foreground font-normal">(optional)</span>}
              </label>
              <textarea
                id="review-comment"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={reviewStatus === 'rejected' ? 'Any overall comments for the QA engineer...' : 'Provide details about your approval...'}
                className="w-full min-h-[80px] p-3 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all animate-fadeIn"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-4">
            <button
              onClick={() => setIsReviewOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleReviewSubmit}
              disabled={reviewTestSuiteMutation.isPending || (reviewStatus === 'rejected' && selectedRejectTcIds.size === 0)}
              className={reviewStatus === 'rejected' ? 'btn-primary bg-rose-600 hover:bg-rose-700 text-white' : 'btn-primary'}
            >
              {reviewTestSuiteMutation.isPending ? 'Submitting...' : reviewStatus === 'approved' ? 'Approve' : 'Request Changes'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/40 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">Test Suite Builder</h1>
            {getApprovalBadge()}

            {/* SRS Document Selector — only shown when project has multiple SRS docs */}
            {hasMultipleSrs && (
              <div className="relative">
                <button
                  onClick={() => setSrsDropdownOpen(!srsDropdownOpen)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted/60 text-foreground transition-all cursor-pointer"
                  title="Switch between SRS documents"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span className="truncate max-w-[180px]">{activeSrsName}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${srsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {srsDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setSrsDropdownOpen(false)} />
                    <div className="absolute left-0 mt-1.5 w-72 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fadeIn">
                      <div className="p-2.5 border-b border-border">
                        <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider">SRS Documents</span>
                      </div>
                      <div className="max-h-[260px] overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                        {srsDocs.map((doc) => {
                          const isCurrent = selectedSrsId === doc._id
                          const docApproval = getApprovalStatusForSrs(doc._id)
                          return (
                            <button
                              key={doc._id}
                              onClick={() => handleSrsSelect(doc._id)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                isCurrent
                                  ? 'bg-primary/10 text-foreground font-semibold border border-primary/20'
                                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isCurrent ? 'text-primary' : 'text-muted-foreground/60'}`} />
                                <span className="truncate">{doc.originalFileName || 'Unnamed Document'}</span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {docApproval === 'approved' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    <ShieldCheck className="w-2.5 h-2.5" /> Approved
                                  </span>
                                )}
                                {docApproval === 'pending_approval' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                                    <Clock className="w-2.5 h-2.5" /> Pending
                                  </span>
                                )}
                                {docApproval === 'rejected' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    Changes
                                  </span>
                                )}
                                {docApproval === 'draft' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded bg-muted text-muted-foreground border border-border">
                                    Draft
                                  </span>
                                )}
                                {isCurrent && <Check className="w-3.5 h-3.5 text-primary" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{testCases.length} test cases — edit steps, drag to reorder, create new cases</p>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-end gap-2 flex-wrap pt-1 border-t border-border/20">
          {isQA && activeTestSuite?.approvalStatus !== 'pending_approval' && activeTestSuite?.approvalStatus !== 'approved' && (
            <button
              onClick={handleRequestApproval}
              disabled={requestApprovalMutation.isPending}
              className="btn-secondary text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
              title="Request project manager's review and approval"
            >
              <Send className="w-4 h-4" /> {requestApprovalMutation.isPending ? 'Sending...' : 'Send for Approval'}
            </button>
          )}
          {isPM && activeTestSuite?.approvalStatus === 'pending_approval' && (
            <button
              onClick={() => {
                setReviewStatus('approved')
                setReviewComment('')
                setSelectedRejectTcIds(new Set())
                setRejectFeedbackMap({})
                setIsReviewOpen(true)
              }}
              className="btn-primary bg-amber-600 hover:bg-amber-700 text-white"
            >
              <ShieldCheck className="w-4 h-4" /> Review Test Suite
            </button>
          )}

          <button
            onClick={() => handleSave()}
            disabled={saveSuiteMutation.isPending}
            className={saveSuccess ? 'btn-secondary bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' : 'btn-secondary'}
          >
            {saveSuiteMutation.isPending ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
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
            disabled={testCases.length === 0 || !isApproved}
            className="btn-primary"
            title={!isApproved ? 'Test suite must be approved before running' : ''}
          >
            <PlayCircle className="w-4 h-4" /> Run Test Suite
          </button>
        </div>
      </div>

      {/* Review Comments / Feedback History Section */}
      {activeTestSuite?.comments && activeTestSuite.comments.length > 0 && (
        <div className="border border-border/80 bg-card/45 rounded-xl p-4 space-y-3 shadow-sm">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-primary" /> Review History & Feedback
          </h3>
          <div className="space-y-3 divide-y divide-border/40">
            {activeTestSuite && activeTestSuite?.comments && activeTestSuite?.comments?.map((c, idx) => (
              <div key={idx} className="pt-3 first:pt-0 flex gap-3 text-[11px] leading-relaxed">
                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                  {c?.userName && c?.userName?.substring(0, 2)?.toUpperCase() || "-"}
                </div>
                <div className="min-w-0 flex-grow">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {c.userName}{' '}
                      <span className="text-[9px] font-normal text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded ml-1">
                        {c.role === 'project_manager' ? 'PM' : c.role}
                      </span>
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{c.commentText}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejection feedback banner for QA */}
      {activeTestSuite?.approvalStatus === 'rejected' && pendingFeedback.length > 0 && isQA && (
        <div className="border border-rose-500/30 bg-rose-500/5 rounded-xl p-4 space-y-3 shadow-sm">
          <h3 className="text-xs font-bold text-rose-500 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" /> PM Feedback — {pendingFeedback.length} test case{pendingFeedback.length !== 1 ? 's' : ''} need attention
          </h3>
          <div className="space-y-2">
            {pendingFeedback.map(fb => {
              const tc = testCases.find(t => t.id === fb.testCaseId)
              return (
                <div key={fb.testCaseId} className="bg-card border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-primary">{fb.testCaseId}</span>
                      <span className="text-xs font-medium text-foreground truncate">{tc?.title || 'Unknown'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground bg-rose-500/5 border border-rose-500/10 rounded-lg px-3 py-2">
                    <span className="font-semibold text-rose-500 text-[10px] uppercase block mb-0.5">PM Feedback</span>
                    {fb.feedback}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResolveRejection(fb.testCaseId, 'rejected_change')}
                      disabled={resolveRejectionFeedbackMutation.isPending}
                      className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all font-semibold"
                      title="Dismiss PM's suggestion"
                    >
                      <Ban className="w-3 h-3" /> Reject Change
                    </button>
                    <button
                      onClick={() => handleAiResolveRejection(fb.testCaseId)}
                      disabled={aiResolveRejectionFeedbackMutation.isPending}
                      className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all font-semibold"
                      title="AI will update this test case based on PM feedback and project context"
                    >
                      {aiResolveRejectionFeedbackMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Update
                    </button>
                    <button
                      onClick={() => {
                        setSelectedId(fb.testCaseId)
                        handleResolveRejection(fb.testCaseId, 'manually_updated')
                      }}
                      disabled={resolveRejectionFeedbackMutation.isPending}
                      className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-all font-semibold"
                      title="Open the test case editor to make manual changes"
                    >
                      <Pencil className="w-3 h-3" /> Edit Manually
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
          approvalStatus={activeTestSuite?.approvalStatus}
          rejectionFeedback={activeTestSuite?.rejectionFeedback}
        />
      </div>

      <Dialog open={selectedId ? true : false} onOpenChange={(open) => { if (!open) setSelectedId(null) }}>
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
              projectId={project._id}
              onEditMeta={openEditDialog}
              onAddStep={() => { if (selectedTc) addStep(selectedTc.id) }}
              onDeleteStep={(idx) => { if (selectedTc) deleteStep(selectedTc.id, idx) }}
              onUpdateStep={(idx, patch) => { if (selectedTc) updateStep(selectedTc.id, idx, patch) }}
              onReorder={(from, to) => { if (selectedTc) reorderSteps(selectedTc.id, from, to) }}
              onUpdateTestCase={(patch) => { if (selectedTc) updateTestCase(selectedTc.id, patch) }}
              rejectionFeedback={(activeTestSuite?.rejectionFeedback || []).find(f => f.testCaseId === selectedTc.id && f.resolvedByAction === 'pending')}
              onResolveRejection={handleResolveRejection}
              onAiResolveRejection={handleAiResolveRejection}
              isResolvingFeedback={resolveRejectionFeedbackMutation.isPending}
              isAiResolvingFeedback={aiResolveRejectionFeedbackMutation.isPending}
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
        modules={existingModules}
      />
    </div>
  )
}
