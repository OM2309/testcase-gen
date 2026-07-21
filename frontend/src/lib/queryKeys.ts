/**
 * Centralized query key factory for TanStack Query.
 * Every query in the app must use keys from here — never raw string arrays.
 */
export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    list: (search: string, page?: number, limit?: number) =>
      ['projects', { search, page, limit }] as const,
    detail: (id: string) => ['projects', id] as const,
  },

  executions: {
    byProject: (projectId: string) => ['executions', projectId] as const,
    detail: (runId: string) => ['executions', 'run', runId] as const,
  },

  jira: {
    issues: (projectId: string, search: string) =>
      ['jira-issues', projectId, search] as const,
  },

  linear: {
    issues: (projectId: string, search: string) =>
      ['linear-issues', projectId, search] as const,
  },

  users: {
    all: ['users'] as const,
  },
} as const
