import { z } from 'zod'

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required').trim(),
    email: z.string().email('Invalid email address').trim(),
    password: z.string().min(1, 'Password is required'),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').trim(),
    password: z.string().min(1, 'Password is required'),
  }),
})

export const googleNextSchema = z.object({
  body: z.object({
    email: z.string().email('Email is required').trim(),
    username: z.string().optional(),
  }),
})

export const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['project_manager', 'qa', 'developer'], {
      errorMap: () => ({ message: 'Invalid profession. Choose developer, qa, or project_manager.' }),
    }),
  }),
})

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
  body: z.object({
    role: z.enum(['admin', 'project_manager', 'qa', 'developer', 'pending'], {
      errorMap: () => ({ message: 'Invalid role.' }),
    }),
  }),
})

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().optional(),
    role: z.enum(['project_manager', 'qa', 'developer']).optional(),
  }),
})

export const toggleUserStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required'),
  }),
  body: z.object({
    isActive: z.boolean({
      invalid_type_error: 'isActive status must be a boolean.',
    }),
  }),
})
