'use client'

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { FolderKanban, FileCheck, ShieldCheck, Sun, Moon, PlayCircle, Layers, LogOut } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useProject } from "../contexts/ProjectContext"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
}

export function AppSidebar({
  theme,
  setTheme,
  ...props
}: AppSidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const { project, requirementAnalyses, testSuites } = useProject()

  const hasRequirements = requirementAnalyses && requirementAnalyses.some(r => r.status === 'completed')
  const hasTestSuite = testSuites && testSuites.length > 0

  const getActiveTab = () => {
    if (pathname.includes('/modules')) return 'modules'
    if (pathname.includes('/requirements')) return 'requirements'
    if (pathname.includes('/test-cases')) return 'testcases'
    if (pathname.includes('/execution')) return 'execution'
    return 'projects'
  }

  const activeTab = getActiveTab()

  const navigateTo = (tab: string) => {
    if (!project) return
    const id = project._id
    if (tab === 'projects') router.push('/dashboard/projects')
    else if (tab === 'modules') router.push(`/dashboard/${id}/modules`)
    else if (tab === 'requirements') router.push(`/dashboard/${id}/requirements`)
    else if (tab === 'testcases') router.push(`/dashboard/${id}/test-cases`)
    else if (tab === 'execution') router.push(`/dashboard/${id}/execution`)
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
                TG
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-foreground block">TestGen AI</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Playwright Agent MVP</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4 space-y-1.5">
        <SidebarMenu className="gap-1.5 cursor-pointer">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'projects'}
              onClick={() => router.push('/dashboard/projects')}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5 cursor-pointer"
            >
              <FolderKanban className="w-4 h-4" /> Repository
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'modules'}
              disabled={!project}
              onClick={() => navigateTo('modules')}
              className="w-full cursor-pointer text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Layers className="w-4 h-4" /> Modules
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'requirements'}
              disabled={!project || !hasRequirements}
              onClick={() => navigateTo('requirements')}
              className="w-full cursor-pointer text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileCheck className="w-4 h-4" /> Requirements
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'testcases'}
              disabled={!project || !hasTestSuite}
              onClick={() => navigateTo('testcases')}
              className="w-full cursor-pointer text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" /> Test Suite
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'execution'}
              disabled={!project}
              onClick={() => navigateTo('execution')}
              className="w-full cursor-pointer text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlayCircle className="w-4 h-4" /> Execution
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-4 bg-muted/10">
        {project && (
          <div className="border border-border/60 bg-card rounded-lg p-3 space-y-1">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Active Project</span>
            <span className="font-semibold text-xs text-foreground block line-clamp-1">{project.projectName}</span>
          </div>
        )}

        {session?.user && (
          <div className="border border-border/60 bg-card rounded-lg p-3 flex items-center justify-between gap-2.5 animate-fadeIn">
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block">Developer</span>
              <span className="font-semibold text-xs text-foreground block truncate">{session.user.name || session.user.email}</span>
            </div>
            <button
              onClick={() => signOut()}
              title="Log Out"
              className="p-2 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 border border-transparent hover:border-rose-500/20 bg-card transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">Theme</span>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-md hover:bg-muted border border-border/60 bg-card transition-colors text-foreground"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
