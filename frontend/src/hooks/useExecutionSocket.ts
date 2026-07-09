'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { TestRun } from '../types'
import { SERVER_ORIGIN } from '../services/executionService'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

export function useExecutionSocket(runId: string | null) {
  const [run, setRun] = useState<TestRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) {
      setRun(null)
      return
    }

    setLoading(true)
    setError(null)

    // Initial fetch to populate state immediately
    fetch(`/api/executions/${runId}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && resData.data) {
          setRun(resData.data)
        } else {
          setError(resData.message || 'Failed to fetch execution details')
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load execution')
      })
      .finally(() => {
        setLoading(false)
      })

    const socketUrl = SERVER_ORIGIN || 'http://localhost:5000'
    const socket: Socket = io(socketUrl)

    socket.on('connect', () => {
      socket.emit('join-run', runId)
    })

    socket.on('run-update', (updatedRun: TestRun) => {
      if (updatedRun._id === runId) {
        setRun((prevRun) => {
          if (prevRun && (prevRun.status === 'running' || prevRun.status === 'queued')) {
            if (updatedRun.status === 'completed') {
              toast.success('Test execution finished successfully! 🏆')
              confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.5 }
              })
            } else if (updatedRun.status === 'failed') {
              toast.error('Test execution failed. ⚠️')
            }
          }
          return updatedRun
        })
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [runId])

  return { run, loading, error, refetch: () => { } }
}
