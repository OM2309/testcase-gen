import { z } from 'zod'

export const startExecutionSchema = z.object({
  body: z.object({
    projectId: z.string().min(1, 'projectId is required'),
    testSuiteId: z.string().min(1, 'testSuiteId is required'),
    baseUrl: z.string().min(1, 'baseUrl is required'),
    headless: z.boolean().optional(),
    testCaseIds: z.array(z.string()).nullable().optional(),
  }),
})

export const getExecutionRunSchema = z.object({
  params: z.object({
    runId: z.string().min(1, 'runId is required'),
  }),
})

export const getProjectExecutionsSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'projectId is required'),
  }),
})
