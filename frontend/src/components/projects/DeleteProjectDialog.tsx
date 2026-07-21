'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting?: boolean
}

/**
 * Confirmation modal for deleting a project.
 */
export function DeleteProjectDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Delete Project?</DialogTitle>
          <DialogDescription className="text-xs">
            This will permanently delete the project and all its analyses and test suites.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button onClick={() => onOpenChange(false)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-destructive">
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
