import { z } from 'zod'

export const createProjectOnlySchema = z.object({
  body: z.object({
    projectName: z.string().min(1, 'Project name is required').trim(),
    projectDescription: z.string().optional(),
  }),
})

export const updateProjectSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    projectName: z.string().optional(),
    projectDescription: z.string().optional(),
  }),
})

export const assignUsersSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    userIds: z.array(z.string()).default([]),
  }),
})

export const connectJiraSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    host: z.string().optional(),
    jiraHost: z.string().optional(),
    email: z.string().optional(),
    jiraEmail: z.string().optional(),
    token: z.string().optional(),
    jiraToken: z.string().optional(),
    projectKey: z.string().optional(),
    jiraProjectKey: z.string().optional(),
  }).refine(
    (data) => (data.host || data.jiraHost) && (data.email || data.jiraEmail) && (data.token || data.jiraToken) && (data.projectKey || data.jiraProjectKey),
    { message: 'All Jira fields (host, email, token, projectKey) are required.' }
  ),
})

export const connectLinearSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    apiKey: z.string().optional(),
    linearApiKey: z.string().optional(),
    teamId: z.string().optional(),
    linearTeamId: z.string().optional(),
  }),
})
