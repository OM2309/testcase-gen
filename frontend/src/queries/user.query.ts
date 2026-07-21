'use client'

import { useQuery } from '@tanstack/react-query'
import { authService } from '../services/authService'
import { queryKeys } from '../lib/queryKeys'

/**
 * All users in the system — used for project assignment.
 */
export function useUsersQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const res = await authService.getUsers()
      return res.data || []
    },
    enabled,
  })
}
