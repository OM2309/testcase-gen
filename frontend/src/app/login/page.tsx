'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LoginView } from '@/components/LoginView'
import { Loader2 } from 'lucide-react'

function LoginLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
      <p className="text-xs text-muted-foreground font-semibold">Loading login workspace...</p>
    </div>
  )
}

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      const sessionRole = (session as any)?.user?.role
      if (sessionRole === 'pending') {
        router.replace('/choose-role')
      } else {
        router.replace('/dashboard/projects')
      }
    }
  }, [status, session, router])

  if (status === 'loading' || status === 'authenticated') {
    return null
  }

  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginView />
    </Suspense>
  )
}
