'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { uploadService } from '../services/uploadService'
import { Loader2, FolderPlus, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const schema = z.object({
  projectName: z
    .string()
    .min(1, 'Project name is required')
    .min(2, 'Project name must be at least 2 characters')
    .max(100, 'Project name must be under 100 characters'),
  projectDescription: z
    .string()
    .min(1, 'Description is required')
    .min(5, 'Description must be at least 5 characters')
    .max(500, 'Description must be under 500 characters')
})

type FormValues = z.infer<typeof schema>

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated: (projectId: string) => void
}

export function CreateProjectModal({ open, onOpenChange, onProjectCreated }: CreateProjectModalProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectName: '',
      projectDescription: ''
    }
  })

  const projectNameValue = watch('projectName')
  const projectDescValue = watch('projectDescription')

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await uploadService.createProjectOnly(data.projectName, data.projectDescription)
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['projects'] })
        toast.success(`Project "${data.projectName}" created successfully! 🎉`)
        reset()
        onOpenChange(false)
        onProjectCreated(res.data._id)
      }
    } catch (err: any) {
      console.error('Failed to create project', err)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      reset()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">

        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border px-6 pt-6 pb-5">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/5 -translate-y-8 translate-x-8 pointer-events-none" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FolderPlus className="w-4.5 h-4.5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold">Create New Project</DialogTitle>
            </div>

          </DialogHeader>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          {/* Project Name */}
          <div className="space-y-1.5">
            <label htmlFor="projectName" className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Project Name
              <span className="text-primary text-xs">*</span>
            </label>
            <div className="relative">
              <input
                id="projectName"
                type="text"
                autoFocus
                autoComplete="off"
                placeholder="e.g. Todo Application v2"
                {...register('projectName')}
                className={`w-full px-3 py-2 text-sm bg-card border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition placeholder:text-muted-foreground ${errors.projectName
                  ? 'border-error/50 bg-error/5 focus:ring-error focus:border-error'
                  : 'border-border focus:ring-primary focus:border-primary'
                  }`}
              />
              {projectNameValue && !errors.projectName && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </div>
            {errors.projectName && (
              <p className="text-xs text-error flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {errors.projectName.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="projectDescription" className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Description
              <span className="text-primary text-xs">*</span>
            </label>
            <div className="relative">
              <textarea
                id="projectDescription"
                rows={3}
                placeholder="Brief description of what this project covers..."
                {...register('projectDescription')}
                className={`w-full px-3 py-2 text-sm bg-card border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition resize-none placeholder:text-muted-foreground ${errors.projectDescription
                  ? 'border-error/50 bg-error/5 focus:ring-error focus:border-error'
                  : 'border-border focus:ring-primary focus:border-primary'
                  }`}
              />
              <div className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground font-mono">
                {projectDescValue.length}/500
              </div>
            </div>
            {errors.projectDescription && (
              <p className="text-xs text-error flex items-center gap-1.5 mt-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {errors.projectDescription.message}
              </p>
            )}
          </div>


          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary min-w-[130px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
