'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { agentService } from '../services/agentService'
import { queryKeys } from '../lib/queryKeys'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

/** Run Agent 0 — accuracy score and document feedback. */
export function useRunAgent0Mutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (srsDocumentId?: string) =>
      agentService.analyzeScore(projectId, srsDocumentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success('Agent 0 document analysis completed! Score & feedback generated. 🎯')
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } })
    },
    onError: (err: unknown) => {
      const msg = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || 'Agent 0 analysis failed. Please try again.'
      toast.error(msg)
    },
  })
}

/** Run Agent 1 — module and feature extraction. */
export function useRunAgent1Mutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { srsDocumentId?: string; mode?: string } = {}) =>
      agentService.generateRequirements(projectId, params.srsDocumentId, params.mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success('Agent 1 module extraction completed successfully! ✨')
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    },
    onError: (err: unknown) => {
      const msg = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || 'Agent 1 module extraction failed. Please try again.'
      toast.error(msg)
    },
  })
}

/** Run Agent 2 — test suite generation. */
export function useRunAgent2Mutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (srsDocumentId?: string) =>
      agentService.generateTestSuite(projectId, srsDocumentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success('Agent 2 successfully generated the test suite! 🚀')
      // Celebratory side splashes
      const end = Date.now() + 2000
      const frame = () => {
        confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } })
        confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
    },
    onError: (err: unknown) => {
      const msg = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || 'Agent 2 test generation failed. Please try again.'
      toast.error(msg)
    },
  })
}

/** Run Gap Fill analysis. */
export function useRunGapFillMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (srsDocumentId?: string) =>
      agentService.generateGapFill(projectId, srsDocumentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success('AI Gap Analysis completed! Review the suggested improvements. 🔍')
    },
    onError: (err: unknown) => {
      const msg = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.message || 'Gap-fill analysis failed. Please try again.'
      toast.error(msg)
    },
  })
}

/** Save test suite changes. */
export function useSaveTestSuiteMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ suiteId, testCases }: { suiteId: string; testCases: unknown[] }) =>
      agentService.saveTestSuite(projectId, suiteId, testCases),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
    },
    onError: (err: Error) => {
      console.error('Failed to save test suite', err)
    },
  })
}

/** Toggle test case regressive status. */
export function useToggleRegressiveMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ suiteId, testCaseId }: { suiteId: string; testCaseId: string }) =>
      agentService.toggleTestCaseRegressive(projectId, suiteId, testCaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
    },
    onError: (err: Error) => {
      console.error('Failed to toggle regressive status', err)
    },
  })
}

/** AI generate a single test case. */
export function useAiGenerateTestCaseMutation(projectId: string) {
  return useMutation({
    mutationFn: (params: { requirement: string; module?: string; priority?: string }) =>
      agentService.aiGenerateTestCase(projectId, params.requirement, params.module, params.priority),
    onError: (err: Error) => {
      console.error('AI test case generation failed', err)
    },
  })
}

/** AI update test case steps. */
export function useAiUpdateStepsMutation(projectId: string) {
  return useMutation({
    mutationFn: (payload: { testCase: unknown; instructions: string; screenshot?: string | null }) =>
      agentService.aiUpdateTestCaseSteps(projectId, payload),
    onError: (err: Error) => {
      console.error('AI step update failed', err)
    },
  })
}

/** Upload SRS document to a project. */
export function useUploadSrsMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => {
      const { uploadService } = require('../services/uploadService')
      return uploadService.addSrsToProject(projectId, file)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
    },
    onError: (err: Error) => {
      console.error('Upload failed', err)
    },
  })
}

/** Request test suite approval. */
export function useRequestApprovalMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (suiteId: string) =>
      agentService.requestTestSuiteApproval(projectId, suiteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success('Approval request submitted successfully! 📬')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to request approval. Please try again.'
      toast.error(msg)
    }
  })
}

/** Submit test suite review comment and status. */
export function useReviewTestSuiteMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      suiteId,
      status,
      comment,
      rejectedTestCases
    }: {
      suiteId: string
      status: 'approved' | 'rejected'
      comment: string
      rejectedTestCases?: Array<{ testCaseId: string; feedback: string }>
    }) =>
      agentService.reviewTestSuite(projectId, suiteId, status, comment, rejectedTestCases),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      const statusLabel = res.data?.approvalStatus === 'approved' ? 'Approved' : 'Rejected'
      toast.success(`Test suite review submitted: ${statusLabel} 📝`)
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to submit review. Please try again.'
      toast.error(msg)
    }
  })
}

/** Resolve rejection feedback (reject change or mark manually updated). */
export function useResolveRejectionFeedbackMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      suiteId,
      testCaseId,
      action
    }: {
      suiteId: string
      testCaseId: string
      action: 'rejected_change' | 'manually_updated'
    }) =>
      agentService.resolveRejectionFeedback(projectId, suiteId, testCaseId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success('Feedback resolved ✓')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to resolve feedback.'
      toast.error(msg)
    }
  })
}

/** AI resolve rejection feedback using PM feedback + project context. */
export function useAiResolveRejectionFeedbackMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      suiteId,
      testCaseId
    }: {
      suiteId: string
      testCaseId: string
    }) =>
      agentService.aiResolveRejectionFeedback(projectId, suiteId, testCaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) })
      toast.success('Test case updated by AI based on PM feedback! ✨')
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'AI update failed. Please try again.'
      toast.error(msg)
    }
  })
}

