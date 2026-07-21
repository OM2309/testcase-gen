'use client'

import React from 'react'
import { FolderOpen, FileText, FlaskConical, Clock, Pencil, UserPlus, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from '../ui/avatar'
import { Project } from '../../types'

interface ProjectListItemProps {
  project: Project
  canAssign: boolean
  onSelectProject: (id: string) => void
  onEditClick: (project: Project, e: React.MouseEvent) => void
  onAssignClick: (id: string, assignedUsers: any[], e: React.MouseEvent) => void
  onDeleteClick: (id: string, e: React.MouseEvent) => void
}

/**
 * List layout item for a single project.
 */
export function ProjectListItem({
  project,
  canAssign,
  onSelectProject,
  onEditClick,
  onAssignClick,
  onDeleteClick,
}: ProjectListItemProps) {
  const srsCount = project.srsDocuments?.length ?? (project.originalFileName ? 1 : 0)

  return (
    <div
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
          {project.assignedUsers && project.assignedUsers.length > 0 && (
            <AvatarGroup className="pl-1.5 *:data-[slot=avatar]:size-5 *:data-[slot=avatar]:ring-1">
              {project.assignedUsers.slice(0, 3).map((u: any) => (
                <Avatar key={u._id || u} size="sm">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-[8px]">
                    {(u.username || 'U').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.assignedUsers.length > 3 && (
                <AvatarGroupCount className="size-5 text-[8px] font-bold">
                  +{project.assignedUsers.length - 3}
                </AvatarGroupCount>
              )}
            </AvatarGroup>
          )}
        </div>

        <div className="flex items-center gap-3 pl-2.5 border-l border-border/60">
          {canAssign && (
            <>
              <button
                onClick={(e) => onEditClick(project, e)}
                className="p-1.5 rounded-md hover:bg-white text-muted-foreground hover:text-primary transition-all cursor-pointer"
                title="Edit Project"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => onAssignClick(project._id, project.assignedUsers || [], e)}
                className="p-1.5 rounded-md hover:bg-white text-muted-foreground hover:text-primary transition-all cursor-pointer"
                title="Assign Members"
              >
                <UserPlus className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={(e) => onDeleteClick(project._id, e)}
            className="p-1.5 rounded-md hover:bg-white text-muted-foreground hover:text-red-600 transition-all cursor-pointer"
            title="Delete Project"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
