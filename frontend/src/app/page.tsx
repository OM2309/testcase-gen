'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

export default function Home() {
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
    } else if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, session, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
        <div className="absolute inset-2 rounded-full border-4 border-primary/30 animate-spin" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-[18px] rounded-full bg-primary/20 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-semibold">Verifying secure session...</p>
    </div>
  )
}
