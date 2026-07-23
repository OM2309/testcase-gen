import { z } from 'zod'

export const generateRequirementsSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
    srsDocumentId: z.string().optional(),
  }),
  body: z.object({
    mode: z.enum(['srs_only', 'figma_only', 'srs_and_figma']).default('srs_only'),
  }).optional(),
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
