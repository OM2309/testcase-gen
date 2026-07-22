'use client'

import { useQuery } from '@tanstack/react-query'
import { notificationService } from '../services/notificationService'
import { queryKeys } from '../lib/queryKeys'

/**
 * Fetch user notifications, polling every 8 seconds.
 */
export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: async () => {
      const res = await notificationService.getNotifications()
      return res.data || []
    },
    refetchInterval: 8000, // Poll notifications every 8s
  })
}
