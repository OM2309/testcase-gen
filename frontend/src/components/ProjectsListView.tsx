'use client'

import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { projectService } from '../services/projectService'
import { useProjectsQuery } from '../hooks/queries'
import {
  FolderOpen, Trash2, Plus, Clock, FileText, FlaskConical,
  Loader2, AlertCircle, CheckCircle2, UploadCloud, BrainCircuit
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreateProjectModal } from './CreateProjectModal'

interface ProjectsListViewProps {
  onSelectProject: (projectId: string) => void
}

export function ProjectsListView({ onSelectProject }: ProjectsListViewProps) {
  const queryClient = useQueryClient()
  const { data: projects = [], isLoading: loading, isError } = useProjectsQuery()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProjectToDelete(id)
    setIsDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!projectToDelete) return
    try {
      await projectService.deleteProject(projectToDelete)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setIsDeleteOpen(false)
      setProjectToDelete(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'tests_generated': return <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
      case 'analyzed': return <BrainCircuit className="w-3.5 h-3.5 text-primary" />
      case 'uploaded': return <UploadCloud className="w-3.5 h-3.5 text-primary" />
      case 'analyzing': return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
      case 'failed': return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
      default: return <FileText className="w-3.5 h-3.5 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-5">
      <CreateProjectModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onProjectCreated={onSelectProject}
      />

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete Project?</DialogTitle>
            <DialogDescription className="text-xs">
              This will permanently delete the project and all its analyses and test suites.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setIsDeleteOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={confirmDelete} className="btn-destructive">Delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Projects</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Select a project or create a new one.</p>
        </div>
        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <>
              {/* Toggle Buttons */}
              <div className="flex items-center bg-muted/60 border border-border/60 p-0.5 rounded-lg mr-1.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Grid View"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="List View"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" />
                    <line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" />
                    <line x1="3" y1="18" x2="3.01" y2="18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <button
                onClick={() => setIsCreateOpen(true)}
                className="btn-primary"
              >
                <Plus className="w-3.5 h-3.5" /> New Project
              </button>
            </>
          )}
        </div>
      </div>

      {isError && (
        <div className="border border-border bg-muted/40 text-muted-foreground p-3 rounded-lg flex items-center gap-2 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          Could not load projects. Make sure the backend is running.
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl flex flex-col items-center justify-center p-16 text-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
            <FolderOpen className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">No projects yet</p>
            <p className="text-xs text-muted-foreground">Create a project to upload requirement documents and generate test cases.</p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" /> Create Project
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* List Layout Format */
        <div className="flex flex-col gap-2.5">
          {projects.map(project => {
            const srsCount = project.srsDocuments?.length ?? (project.originalFileName ? 1 : 0)
            return (
              <div
                key={project._id}
                onClick={() => onSelectProject(project._id)}
                className="group relative border border-border bg-card hover:border-primary/50 hover:shadow-sm hover:bg-muted/10 active:scale-[0.995] rounded-xl p-3.5 cursor-pointer transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left side: Project Icon & Text details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary border border-primary/20 transition-transform duration-300 group-hover:scale-105">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {project.projectName || 'Untitled Project'}
                    </h3>
                    {project.projectDescription && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{project.projectDescription}</p>
                    )}
                  </div>
                </div>

                {/* Right side: Stats, status & action */}
                <div className="flex items-center justify-between sm:justify-end gap-5 flex-shrink-0">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 bg-muted/40 border border-border/40 px-2 py-1 rounded-md">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      {srsCount} {srsCount === 1 ? 'Doc' : 'Docs'}
                    </span>
                    {project.hasTestSuite && (
                      <span className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded-md font-semibold">
                        <FlaskConical className="w-3 h-3 text-primary" />
                        {project.testCasesCount} Cases
                      </span>
                    )}
                    <span className="flex items-center gap-1 bg-muted/40 border border-border/40 px-2 py-1 rounded-md">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pl-2.5 border-l border-border/60">
                    <span className="w-6 h-6 flex items-center justify-center">
                      {getStatusIcon(project.status)}
                    </span>
                    <button
                      onClick={e => handleDelete(project._id, e)}
                      className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Grid Layout Format */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {projects.map(project => {
            const srsCount = project.srsDocuments?.length ?? (project.originalFileName ? 1 : 0)
            return (
              <div
                key={project._id}
                onClick={() => onSelectProject(project._id)}
                className="group relative border border-border bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] rounded-xl p-4 cursor-pointer transition-all duration-200"
              >
                <button
                  onClick={e => handleDelete(project._id, e)}
                  className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="pr-6 space-y-1 mb-4">
                  <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {project.projectName || 'Untitled Project'}
                  </h3>
                  {project.projectDescription && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{project.projectDescription}</p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {srsCount} {srsCount === 1 ? 'Doc' : 'Docs'}
                    </span>
                    {project.hasTestSuite && (
                      <span className="flex items-center gap-1 text-primary font-semibold">
                        <FlaskConical className="w-3 h-3 text-primary" />
                        {project.testCasesCount}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {getStatusIcon(project.status)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
