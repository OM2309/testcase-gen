'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { FolderOpen, Plus } from 'lucide-react'
import { Project } from '../types'
import { useProjectsQuery } from '../queries/project.query'
import { useUsersQuery } from '../queries/user.query'
import {
  useDeleteProjectMutation,
  useUpdateProjectMutation,
  useAssignUsersMutation,
} from '../mutations/project.mutation'
import { CreateProjectModal } from './CreateProjectModal'
import { EmptyState, InlineError } from '@/components/shared'
import {
  DeleteProjectDialog,
  AssignUsersDialog,
  EditProjectDialog,
  ProjectListItem,
  ProjectGridCard,
  ProjectSkeletons,
} from '@/components/projects'

interface ProjectsListViewProps {
  onSelectProject: (projectId: string) => void
}

export function ProjectsListView({ onSelectProject }: ProjectsListViewProps) {
  // Search & Pagination states
  const [searchVal, setSearchVal] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Debounce search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchVal)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchVal])

  const { data, isLoading: loading, isError } = useProjectsQuery(search, page, 6)
  const { data: session } = useSession()

  const projects: Project[] = data?.projects || []
  const totalPages = data?.totalPages || 1
  const currentPage = data?.currentPage || 1
  const totalCount = data?.totalCount || 0

  const userRole = (session as any)?.user?.role
  const canAssign = userRole === 'admin' || userRole === 'project_manager'
  const canCreate = userRole === 'admin' || userRole === 'project_manager'

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [projectToAssign, setProjectToAssign] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // Queries & Mutations
  const { data: users = [] } = useUsersQuery(isAssignOpen && canAssign)
  const deleteMutation = useDeleteProjectMutation()
  const updateMutation = useUpdateProjectMutation()
  const assignMutation = useAssignUsersMutation()

  const handleAssignClick = (id: string, currentlyAssigned: any[] = [], e: React.MouseEvent) => {
    e.stopPropagation()
    setProjectToAssign(id)
    setSelectedUserIds(currentlyAssigned.map((u) => u._id || u))
    setIsAssignOpen(true)
  }

  const confirmAssign = () => {
    if (!projectToAssign) return
    assignMutation.mutate(
      { projectId: projectToAssign, userIds: selectedUserIds },
      {
        onSuccess: () => {
          setIsAssignOpen(false)
          setProjectToAssign(null)
        },
      }
    )
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleEditClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setProjectToEdit(project._id)
    setEditName(project.projectName || '')
    setEditDesc(project.projectDescription || '')
    setIsEditOpen(true)
  }

  const confirmEdit = () => {
    if (!projectToEdit || !editName.trim()) return
    updateMutation.mutate(
      {
        projectId: projectToEdit,
        payload: { projectName: editName.trim(), projectDescription: editDesc.trim() },
      },
      {
        onSuccess: () => {
          setIsEditOpen(false)
          setProjectToEdit(null)
        },
      }
    )
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setProjectToDelete(id)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (!projectToDelete) return
    deleteMutation.mutate(projectToDelete, {
      onSuccess: () => {
        setIsDeleteOpen(false)
        setProjectToDelete(null)
      },
    })
  }

  return (
    <div className="space-y-5">
      <CreateProjectModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onProjectCreated={onSelectProject}
      />

      <DeleteProjectDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
      />

      <AssignUsersDialog
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        users={users}
        selectedUserIds={selectedUserIds}
        onToggleUser={toggleUserSelection}
        onConfirm={confirmAssign}
        saving={assignMutation.isPending}
      />

      <EditProjectDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        editName={editName}
        setEditName={setEditName}
        editDesc={editDesc}
        setEditDesc={setEditDesc}
        onConfirm={confirmEdit}
        saving={updateMutation.isPending}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Projects</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a project or create a new one.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

          {canCreate && (
            <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
              <Plus className="w-3.5 h-3.5" /> New Project
            </button>
          )}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md w-full">
        <svg
          className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search projects by name or description..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-card border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        />
        {searchVal && (
          <button
            onClick={() => setSearchVal('')}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {isError && (
        <InlineError message="Could not load projects. Make sure the backend is running." />
      )}

      {loading ? (
        <ProjectSkeletons viewMode={viewMode} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create a project to upload requirement documents and generate test cases."
          action={
            canCreate ? (
              <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
                <Plus className="w-3.5 h-3.5" /> Create Project
              </button>
            ) : null
          }
        />
      ) : viewMode === 'list' ? (
        <div className="flex flex-col gap-2.5">
          {projects.map((proj) => (
            <ProjectListItem
              key={proj._id}
              project={proj}
              canAssign={canAssign}
              onSelectProject={onSelectProject}
              onEditClick={handleEditClick}
              onAssignClick={handleAssignClick}
              onDeleteClick={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {projects.map((proj) => (
            <ProjectGridCard
              key={proj._id}
              project={proj}
              canAssign={canAssign}
              onSelectProject={onSelectProject}
              onEditClick={handleEditClick}
              onAssignClick={handleAssignClick}
              onDeleteClick={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/40 pt-4 text-[11px] text-muted-foreground">
          <p>
            Showing page <span className="font-semibold text-foreground">{currentPage}</span> of{' '}
            <span className="font-semibold text-foreground">{totalPages}</span> ({totalCount} total
            projects)
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-border bg-card text-foreground rounded-lg disabled:opacity-50 hover:bg-muted/80 cursor-pointer disabled:cursor-not-allowed select-none transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageIdx = idx + 1
              return (
                <button
                  key={pageIdx}
                  onClick={() => setPage(pageIdx)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg border text-[11px] font-bold cursor-pointer select-none transition-colors ${
                    currentPage === pageIdx
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted/80'
                  }`}
                >
                  {pageIdx}
                </button>
              )
            })}
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-border bg-card text-foreground rounded-lg disabled:opacity-50 hover:bg-muted/80 cursor-pointer disabled:cursor-not-allowed select-none transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
