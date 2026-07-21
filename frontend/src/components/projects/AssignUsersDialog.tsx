'use client'

import React from 'react'
import { Users, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { User } from '../../types'

interface AssignUsersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: User[]
  selectedUserIds: string[]
  onToggleUser: (userId: string) => void
  onConfirm: () => void
  saving: boolean
}

/**
 * Dialog for assigning users/team members to a project.
 */
export function AssignUsersDialog({
  open,
  onOpenChange,
  users,
  selectedUserIds,
  onToggleUser,
  onConfirm,
  saving,
}: AssignUsersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Assign Team Members
          </DialogTitle>
          <DialogDescription className="text-xs">
            Assign developers and QAs to this project so they can view and participate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2.5 my-3 max-h-[220px] overflow-y-auto pr-1">
          {users.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              No users found in the system.
            </p>
          ) : (
            users.map((u) => {
              const isSelected = selectedUserIds.includes(u._id)
              return (
                <div
                  key={u._id}
                  onClick={() => onToggleUser(u._id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer hover:bg-muted/40 transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar size="sm" className="w-7 h-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                        {u.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-foreground">{u.username}</div>
                      <div className="text-[10px] text-muted-foreground">{u.email}</div>
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                      u.role === 'admin'
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        : u.role === 'project_manager'
                        ? 'bg-violet-500/10 text-violet-500 border-violet-500/20'
                        : u.role === 'qa'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : u.role === 'developer'
                        ? 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                        : 'bg-muted text-muted-foreground border-border/80'
                    }`}
                  >
                    {u.role === 'project_manager' ? 'PM' : u.role.toUpperCase()}
                  </span>
                </div>
              )
            })
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <button onClick={() => onOpenChange(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="btn-primary flex items-center gap-1.5 cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Assignments
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
