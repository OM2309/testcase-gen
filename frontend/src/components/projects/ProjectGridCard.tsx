'use client'

import React from 'react'
import {
  FileText,
  FlaskConical,
  Clock,
  Pencil,
  UserPlus,
  Trash2,
  CheckCircle2,
  BrainCircuit,
  UploadCloud,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '../ui/avatar'
import { Project } from '../../types'

interface ProjectGridCardProps {
  project: Project
  canAssign: boolean
  onSelectProject: (id: string) => void
  onEditClick: (project: Project, e: React.MouseEvent) => void
  onAssignClick: (id: string, assignedUsers: any[], e: React.MouseEvent) => void
  onDeleteClick: (id: string, e: React.MouseEvent) => void
}

/**
 * Grid layout card for a single project.
 */
export function ProjectGridCard({
  project,
  canAssign,
  onSelectProject,
  onEditClick,
  onAssignClick,
  onDeleteClick,
}: ProjectGridCardProps) {
  const srsCount = project.srsDocuments?.length ?? (project.originalFileName ? 1 : 0)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'tests_generated':
        return <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
      case 'analyzed':
        return <BrainCircuit className="w-3.5 h-3.5 text-primary" />
      case 'uploaded':
        return <UploadCloud className="w-3.5 h-3.5 text-primary" />
      case 'analyzing':
        return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
      case 'failed':
        return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
      default:
        return <FileText className="w-3.5 h-3.5 text-muted-foreground" />
    }
  }

  return (
    <div
      onClick={() => onSelectProject(project._id)}
      className="group relative border border-border bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] rounded-xl p-4 cursor-pointer transition-all duration-200"
    >
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
        {canAssign && (
          <>
            <button
              onClick={(e) => onEditClick(project, e)}
              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
              title="Edit Project"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => onAssignClick(project._id, project.assignedUsers || [], e)}
              className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
              title="Assign Members"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          </>
        )}
        <button
          onClick={(e) => onDeleteClick(project._id, e)}
          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all cursor-pointer"
          title="Delete Project"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

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
          {project.assignedUsers && project.assignedUsers.length > 0 && (
            <AvatarGroup className="pl-1 *:data-[slot=avatar]:size-4.5 *:data-[slot=avatar]:ring-1">
              {project.assignedUsers.slice(0, 3).map((u: any) => (
                <Avatar key={u._id || u} size="sm">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-[7px]">
                    {(u.username || 'U').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.assignedUsers.length > 3 && (
                <AvatarGroupCount className="size-4.5 text-[7px] font-bold">
                  +{project.assignedUsers.length - 3}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          )}
        </div>
        {getStatusIcon(project.status)}
      </div>
    </div>
  )
}
