'use client'

import React, { useEffect, useState } from 'react'
import { projectService } from '../services/projectService'
import { Project } from '../types'
import {
  FolderOpen, Trash2, Plus, Clock, FileText, CheckCircle2,
  Loader2, BrainCircuit, FlaskConical, AlertCircle, UploadCloud
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ProjectsListViewProps {
  onSelectProject: (projectId: string) => void
  onNavigateToUpload: () => void
}

export function ProjectsListView({ onSelectProject, onNavigateToUpload }: ProjectsListViewProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Dialog modal states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await projectService.getAllProjects()
      if (res.success) setProjects(res.data)
    } catch (err: any) {
      setError('Could not load projects. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProjects() }, [])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProjectToDelete(id)
    setIsDeleteOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    try {
      await projectService.deleteProject(projectToDelete)
      setProjects(prev => prev.filter(p => p._id !== projectToDelete))
    } catch (err) {
      console.error('Failed to delete project', err)
    } finally {
      setIsDeleteOpen(false)
      setProjectToDelete(null)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'uploaded': return { label: 'Uploaded', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <UploadCloud className="w-3 h-3" /> }
      case 'analyzing': return { label: 'Analyzing', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: <Loader2 className="w-3 h-3 animate-spin" /> }
      case 'analyzed': return { label: 'Analyzed', cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: <BrainCircuit className="w-3 h-3" /> }
      case 'tests_generated': return { label: 'Tests Ready', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> }
      case 'failed': return { label: 'Failed', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: <AlertCircle className="w-3 h-3" /> }
      default: return { label: status, cls: 'bg-muted text-muted-foreground border-border', icon: null }
    }
  }

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this project and all its requirements analysis and test suites?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setIsDeleteOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-muted text-xs font-semibold">Cancel</button>
            <button onClick={confirmDeleteProject} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-xs font-semibold hover:opacity-90">Delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Select a project to continue analysis or create a new one.</p>
        </div>
        <button
          onClick={onNavigateToUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {error && (
        <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
            <div className="absolute inset-2 rounded-full border-4 border-primary/30 animate-spin" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-[18px] rounded-full bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-20 text-center gap-5 bg-card/10">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="font-bold text-lg">No Projects Yet</h3>
            <p className="text-sm text-muted-foreground">Upload a PRD or SRS document to start generating AI-powered test cases.</p>
          </div>
          <button
            onClick={onNavigateToUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Upload First Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => {
            const s = getStatusConfig(project.status)
            return (
              <div
                key={project._id}
                onClick={() => onSelectProject(project._id)}
                className="group relative border border-border bg-card hover:border-primary/30 hover:shadow-md rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between min-h-[180px]"
              >
                {/* Delete */}
                <button
                  onClick={e => handleDelete(project._id, e)}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="space-y-2 pr-6">
                  <h3 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">
                    {project.projectName || 'Untitled Project'}
                  </h3>
                  {project.projectDescription && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{project.projectDescription}</p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {project.originalFileName?.split('.').pop()?.toUpperCase()}
                    </span>
                    {project.hasTestSuite && (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <FlaskConical className="w-3 h-3" />
                        {project.testCasesCount} tests
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s.cls}`}>
                    {s.icon} {s.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
