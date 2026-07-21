import { z } from 'zod'

export const startInspectorSchema = z.object({
  body: z.object({
    url: z.string().min(1, 'URL is required').url('Must be a valid URL'),
  }),
})
