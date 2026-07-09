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
      case 'tests_generated': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      case 'analyzed': return <BrainCircuit className="w-3.5 h-3.5 text-violet-400" />
      case 'uploaded': return <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
      case 'analyzing': return <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
      case 'failed': return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
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
            <button onClick={() => setIsDeleteOpen(false)} className="px-3 py-1.5 border rounded-lg hover:bg-muted text-xs font-semibold cursor-pointer">Cancel</button>
            <button onClick={confirmDelete} className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-xs font-semibold hover:opacity-90 cursor-pointer">Delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Projects</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Select a project or create a new one.</p>
        </div>
        {projects.length > 0 && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Project
          </button>
        )}
      </div>

      {isError && (
        <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-3 rounded-lg flex items-center gap-2 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {projects.map(project => {
            const srsCount = project.srsDocuments?.length ?? (project.originalFileName ? 1 : 0)
            return (
              <div
                key={project._id}
                onClick={() => onSelectProject(project._id)}
                className="group relative border border-border bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] rounded-xl p-4 cursor-pointer transition-all duration-200"
              >
                <button
                  onClick={e => handleDelete(project._id, e)}
                  className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="pr-6 space-y-1 mb-4">
                  <h3 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">
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
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <FlaskConical className="w-3 h-3" />
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
