'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { ProjectProvider } from '@/contexts/ProjectContext'

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  useEffect(() => {
    const htmlElement = document.documentElement
    if (theme === 'dark') {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
  }, [theme])

  if (status === 'loading' || status === 'unauthenticated') {
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

  const getBreadcrumb = () => {
    if (pathname.includes('/modules')) return 'Project Modules'
    if (pathname.includes('/requirements')) return 'Requirements Analysis'
    if (pathname.includes('/test-cases')) return 'Test Suite Builder'
    if (pathname.includes('/execution')) return 'Test Execution'
    return 'Projects Repository'
  }

  return (
    <ProjectProvider>
      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 14)",
        } as React.CSSProperties}
      >
        <AppSidebar
          theme={theme}
          setTheme={setTheme}
        />
        <SidebarInset>
          <SiteHeader title={getBreadcrumb()} />
          <main className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProjectProvider>
  )
}
