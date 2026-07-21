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
    assignedUsers: z.array(z.string()).default([]),
  }),
})

export const connectJiraSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    jiraHost: z.string().min(1, 'Jira Host is required'),
    jiraEmail: z.string().email('Valid Jira Email is required'),
    jiraToken: z.string().min(1, 'Jira API Token is required'),
    jiraProjectKey: z.string().min(1, 'Jira Project Key is required'),
  }),
})

export const connectLinearSchema = z.object({
  params: z.object({
    projectId: z.string().min(1, 'Project ID is required'),
  }),
  body: z.object({
    linearApiKey: z.string().min(1, 'Linear API Key is required'),
    linearTeamId: z.string().min(1, 'Linear Team ID is required'),
  }),
})
