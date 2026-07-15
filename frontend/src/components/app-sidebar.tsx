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
import { FolderKanban, FileCheck, ShieldCheck, Sun, Moon, PlayCircle, Layers, LogOut, ChevronDown, ChevronRight, BarChart3, FileText, Check, ChevronsUpDown, Sparkles } from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useProject } from "../contexts/ProjectContext"
import { projectService } from "../services/projectService"
import { Project } from "../types"

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
  const { project, selectedSrsId, requirementAnalyses, testSuites } = useProject()
  const [allProjects, setAllProjects] = React.useState<Project[]>([])
  const [projectQuery, setProjectQuery] = React.useState("")

  const filteredProjects = React.useMemo(() => {
    if (!projectQuery) return allProjects
    return allProjects.filter(p =>
      p.projectName.toLowerCase().includes(projectQuery.toLowerCase())
    )
  }, [allProjects, projectQuery])
  
  const isOnReportsPage = pathname.includes('/execution')
  const [isProjectMenuOpen, setIsProjectMenuOpen] = React.useState(!isOnReportsPage)
  const [isReportsMenuOpen, setIsReportsMenuOpen] = React.useState(isOnReportsPage)

  React.useEffect(() => {
    projectService.getAllProjects()
      .then(res => {
        if (res.success && res.data) {
          setAllProjects(res.data)
        }
      })
      .catch(err => console.error("Failed to load projects list in sidebar", err))
  }, [])

  // Auto-open menus depending on current page context
  React.useEffect(() => {
    const isExecution = pathname.includes('/execution')
    if (isExecution) {
      setIsReportsMenuOpen(true)
      setIsProjectMenuOpen(false)
    } else if (project) {
      setIsProjectMenuOpen(true)
      setIsReportsMenuOpen(false)
    }
  }, [pathname, project])

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
    else if (tab === 'testcases') {
      const srsParam = selectedSrsId ? `?srsId=${selectedSrsId}` : ''
      router.push(`/dashboard/${id}/test-cases${srsParam}`)
    }
    else if (tab === 'execution') router.push(`/dashboard/${id}/execution`)
  }

  const handleReportsClick = () => {
    if (project) {
      router.push(`/dashboard/${project._id}/execution`)
    } else if (allProjects.length > 0) {
      router.push(`/dashboard/${allProjects[0]._id}/execution`)
    } else {
      router.push('/dashboard/projects')
    }
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-center w-full">
              <img
                src={theme === 'dark' ? "/Memorres-logo dark theme.png" : "/Memorres-logo-light theme.png"}
                alt="Memorres Logo"
                className="w-full h-auto max-h-16 object-contain"
              />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4 space-y-3">
        <SidebarMenu className="gap-1 cursor-pointer">
          <SidebarMenuItem className="space-y-1.5">
            <button
              onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
              className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center justify-between hover:bg-muted/80 cursor-pointer ${
                activeTab === 'projects' || isProjectMenuOpen ? 'bg-sidebar-accent/30 text-foreground font-bold shadow-sm' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderKanban className="w-4 h-4 text-muted-foreground" />
                <span>Projects</span>
              </div>
              {isProjectMenuOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>

            {isProjectMenuOpen && (
              <div className="space-y-2 px-1">
                {/* Search select panel */}
                <div className="relative flex items-center border border-primary bg-background rounded-lg px-2.5 py-1.5 gap-2 text-xs text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 animate-pulse" />
                  <input
                    type="text"
                    placeholder="Start typing to find proj"
                    value={projectQuery}
                    onChange={(e) => setProjectQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-grow bg-transparent outline-none text-foreground placeholder-muted-foreground text-xs"
                  />
                  <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                </div>

                {/* Dropdown Card */}
                <div className="border border-border bg-card/45 rounded-xl p-2.5 space-y-1.5 shadow-sm">
                  <span className="text-[9px] font-bold text-muted-foreground/80 uppercase tracking-wider block px-1">
                    Other Projects
                  </span>
                  <div className="space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                    {filteredProjects.length === 0 ? (
                      <div className="text-[10px] text-muted-foreground text-center py-2 italic">
                        No projects found
                      </div>
                    ) : (
                      filteredProjects.map((p) => {
                        const isCurrent = project && project._id === p._id
                        return (
                          <div
                            key={p._id}
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/${p._id}/modules`)
                            }}
                            className={`px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                              isCurrent
                                ? 'bg-muted/80 text-foreground font-semibold'
                                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${isCurrent ? 'text-primary' : 'text-muted-foreground/60'}`} />
                              <span className="truncate">{p.projectName}</span>
                            </div>
                            {isCurrent && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className="border-t border-border/40 pt-1.5 mt-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push('/dashboard/projects')
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/40 cursor-pointer"
                    >
                      View All Projects
                    </button>
                  </div>
                </div>

                {project && (
                  <div className="pl-4 ml-5 border-l border-border/80 flex flex-col gap-1 mt-2">
                    <SidebarMenuButton
                      isActive={activeTab === 'testcases'}
                      onClick={() => navigateTo('testcases')}
                      className="w-full cursor-pointer text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2.5 hover:bg-muted/50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>test suits</span>
                    </SidebarMenuButton>
                  </div>
                )}
              </div>
            )}
          </SidebarMenuItem>

          <SidebarMenuItem className="space-y-1">
            <button
              onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
              className={`w-full text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center justify-between hover:bg-muted/80 cursor-pointer ${
                activeTab === 'execution' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span>Reports</span>
              </div>
              {isReportsMenuOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>

            {isReportsMenuOpen && allProjects.length > 0 && (
              <div className="pl-4 ml-5 border-l border-border/80 flex flex-col gap-1 mt-1">
                {allProjects.map((p) => {
                  const isCurrentReportsActive = pathname.includes(`/dashboard/${p._id}/execution`)
                  return (
                    <SidebarMenuButton
                      key={p._id}
                      isActive={isCurrentReportsActive}
                      onClick={() => router.push(`/dashboard/${p._id}/execution`)}
                      className="w-full cursor-pointer text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-2.5 hover:bg-muted/50"
                    >
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="truncate max-w-[120px]">{p.projectName}</span>
                    </SidebarMenuButton>
                  )
                })}
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-4 bg-muted/10">

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
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-primary" /> : <Moon className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
