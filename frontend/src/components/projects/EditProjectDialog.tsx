'use client'

import React from 'react'
import { Pencil, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editName: string
  setEditName: (name: string) => void
  editDesc: string
  setEditDesc: (desc: string) => void
  onConfirm: () => void
  saving: boolean
}

/**
 * Modal dialog for editing project title and description.
 */
export function EditProjectDialog({
  open,
  onOpenChange,
  editName,
  setEditName,
  editDesc,
  setEditDesc,
  onConfirm,
  saving,
}: EditProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" /> Edit Project Details
          </DialogTitle>
          <DialogDescription className="text-xs">
            Update the project's name and descriptive text.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Payments Integration"
              className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">Project Description</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Brief description of the project scope or objectives..."
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs resize-none"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <button onClick={() => onOpenChange(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || !editName.trim()}
            className="btn-primary flex items-center gap-1.5 cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save Changes
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
