'use client'

import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { FolderKanban, Upload, FileCheck, ShieldCheck, PlayCircle, Sun, Moon } from "lucide-react"
import { Project } from "@/services/projectService"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  activeTab: string
  setActiveTab: (tab: any) => void
  hasRequirements: boolean
  hasTestSuite: boolean
  hasRunId: boolean
  selectedProject: Project | null
  theme: 'dark' | 'light'
  setTheme: (theme: 'dark' | 'light') => void
}

export function AppSidebar({
  activeTab,
  setActiveTab,
  hasRequirements,
  hasTestSuite,
  hasRunId,
  selectedProject,
  theme,
  setTheme,
  ...props
}: AppSidebarProps) {
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
        <SidebarMenu className="gap-1.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'projects'}
              onClick={() => setActiveTab('projects')}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5"
            >
              <FolderKanban className="w-4 h-4" /> Repository
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'upload'}
              onClick={() => setActiveTab('upload')}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5"
            >
              <Upload className="w-4 h-4" /> Upload PRD
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'requirements'}
              disabled={!hasRequirements}
              onClick={() => setActiveTab('requirements')}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileCheck className="w-4 h-4" /> Requirements
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'testcases'}
              disabled={!hasTestSuite}
              onClick={() => setActiveTab('testcases')}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShieldCheck className="w-4 h-4" /> Test Suite
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeTab === 'execute'}
              disabled={!hasRunId}
              onClick={() => setActiveTab('execute')}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlayCircle className="w-4 h-4" /> Live Run
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-4 bg-muted/10">
        {selectedProject && (
          <div className="border border-border/60 bg-card rounded-lg p-3 space-y-1">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Active Project</span>
            <span className="font-semibold text-xs text-foreground block line-clamp-1">{selectedProject.projectName}</span>
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
