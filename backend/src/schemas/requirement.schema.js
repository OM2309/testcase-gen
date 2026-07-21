import { z } from 'zod'

export const generateRequirementsSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    srsDocumentId: z.string().optional(),
  }),
})

export const getRequirementsSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
})

export const gapFillSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    srsDocumentId: z.string().optional(),
  }),
})
