'use client'

import React, { useState, useRef } from 'react'
import { Upload, FileText, Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'
import { uploadService } from '../../services/uploadService'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

interface FileUploadTabProps {
  projectId: string
  onSrsUploaded: (updatedProject: unknown) => void
}

/**
 * File upload dropzone + upload button for SRS documents.
 */
export function FileUploadTab({ projectId, onSrsUploaded }: FileUploadTabProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    const isValid = ext === 'pdf' || ext === 'docx' || ext === 'doc'
    if (!isValid) {
      setError('Only PDF, DOC, and DOCX files are accepted.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.')
      return
    }
    setError(null)
    setSuccess(false)
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) selectFile(dropped)
  }

  const handleUpload = async () => {
    if (!file) return
    const fileName = file.name
    try {
      setUploading(true)
      setError(null)
      const res = await uploadService.addSrsToProject(projectId, file)
      if (res.success) {
        setSuccess(true)
        setFile(null)
        onSrsUploaded(res.data)
        toast.success(`Requirement Document "${fileName}" uploaded and parsed! 📁`)
        confetti({ particleCount: 80, spread: 50, origin: { y: 0.8 } })
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err: unknown) {
      const errMsg = (err as Record<string, Record<string, Record<string, string>>>)?.response?.data?.error || 'Upload failed. Please try again.'
      setError(errMsg)
      toast.error('Upload failed. Please check the file format.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="border border-border bg-muted/40 text-muted-foreground p-3 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          {error}
        </div>
      )}

      {success && (
        <div className="border border-primary/20 bg-primary/5 text-primary p-3 rounded-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
          Requirement document uploaded and parsed successfully!
        </div>
      )}

      {!file ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${dragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/40 bg-muted/5 hover:bg-muted/10'
            }`}
          style={{ minHeight: '135px' }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={e => e.target.files?.[0] && selectFile(e.target.files[0])}
            accept=".pdf,.docx,.doc"
            className="hidden"
          />
          <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold">Drop requirement file here or click to browse</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">PDF, DOC or DOCX — up to 5MB</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border border-border bg-card rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-xs">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              disabled={uploading}
              className="btn-secondary h-7 px-2.5 text-xs"
            >
              Change
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleUpload} disabled={uploading} className="btn-primary flex-1">
              {uploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-3.5 h-3.5" /> Upload Document</>
              )}
            </button>
            <button onClick={() => setFile(null)} disabled={uploading} className="btn-secondary h-9 px-3">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
