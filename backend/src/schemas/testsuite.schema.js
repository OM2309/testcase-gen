import { z } from 'zod'

export const generateTestSuiteSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    srsDocumentId: z.string().optional(),
  }).optional().default({}),
})

export const getTestSuiteSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
})

export const updateTestSuiteSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    suiteId: z.string().min(1, 'Suite ID is required'),
  }),
  body: z.object({
    testCases: z.array(z.any()).min(0),
  }),
})

export const toggleTestCaseRegressiveSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    suiteId: z.string().min(1, 'Suite ID is required'),
    testCaseId: z.string().min(1, 'Test Case ID is required'),
  }),
})

export const aiGenerateTestCaseSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    requirement: z.string().min(1, 'Requirement description is required'),
    module: z.string().optional(),
    priority: z.string().optional(),
  }),
})

export const aiUpdateTestCaseStepsSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    testCase: z.object({}).passthrough(),
    instructions: z.string().min(1, 'Instructions are required'),
    screenshot: z.string().nullable().optional(),
  }),
})

export const requestApprovalSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    suiteId: z.string().min(1, 'Suite ID is required'),
  }),
})

export const submitReviewSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    suiteId: z.string().min(1, 'Suite ID is required'),
  }),
  body: z.object({
    status: z.enum(['approved', 'rejected']),
    comment: z.string().min(1, 'Review comment is required'),
  }),
})

