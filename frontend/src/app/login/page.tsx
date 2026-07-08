'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LoginView } from '@/components/LoginView'

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard/projects')
    }
  }, [status, router])

  if (status === 'loading' || status === 'authenticated') {
    return null
  }

  return <LoginView />
}
