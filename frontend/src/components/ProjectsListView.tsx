'use client'

import React, { useEffect, useState } from 'react'
import { projectService, Project } from '../services/projectService'
import { FolderOpen, Trash2, Plus, Clock, FileText, CheckCircle, Loader } from 'lucide-react'

interface ProjectsListViewProps {
  onSelectProject: (projectId: string) => void
  onNavigateToUpload: () => void
}

export function ProjectsListView({ onSelectProject, onNavigateToUpload }: ProjectsListViewProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const loadProjects = async () => {
    try {
      setLoading(true)
      const res = await projectService.getAllProjects()
      if (res.success) {
        setProjects(res.data)
      }
    } catch (err) {
      console.error('Failed to load projects', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this project and all associated analysis?')) return
    try {
      const res = await projectService.deleteProject(id)
      if (res.success) {
        setProjects(projects.filter(p => p._id !== id))
      }
    } catch (err) {
      console.error('Failed to delete project', err)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Uploaded</span>
      case 'analyzing':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 inline-flex items-center gap-1">
            <Loader className="w-3 h-3 animate-spin" /> Analyzing
          </span>
        )
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Ready</span>
      case 'failed':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Failed</span>
      default:
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects Repository</h1>
          <p className="text-sm text-muted-foreground mt-1">Select an existing project analysis or start a new PRD analyzer session.</p>
        </div>
        <button
          onClick={onNavigateToUpload}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading workspace projects...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl flex flex-col items-center justify-center p-16 text-center gap-4 bg-card/20">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">No Projects Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">Upload a Software Requirements Specification (SRS) or Product Requirements Document (PRD) to begin.</p>
          </div>
          <button
            onClick={onNavigateToUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors mt-2"
          >
            <Plus className="w-4 h-4" /> Upload first PRD
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <div
              key={project._id}
              onClick={() => onSelectProject(project._id)}
              className="group relative border border-border bg-card hover:bg-muted/10 hover:border-primary/30 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between min-h-[160px] shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-1">
                    {project.projectName || 'Untitled Project'}
                  </h3>
                  <button
                    onClick={(e) => handleDelete(project._id, e)}
                    className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {project.projectDescription || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> {project.totalModules} modules
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {getStatusBadge(project.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
