'use client'

import React, { useState, useRef } from 'react'
import { uploadService, SrsDocument } from '../services/uploadService'
import {
  Upload, FileText, Loader2, AlertCircle, CheckCircle2,
  UploadCloud, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

interface SrsUploadSectionProps {
  projectId: string
  srsDocuments: SrsDocument[]
  onSrsUploaded: (updatedProject: any) => void
}

export function SrsUploadSection({ projectId, srsDocuments, onSrsUploaded }: SrsUploadSectionProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isValidFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    return ext === 'pdf' || ext === 'docx' || ext === 'doc'
  }

  const selectFile = (f: File) => {
    if (!isValidFile(f)) {
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
        confetti({
          particleCount: 80,
          spread: 50,
          origin: { y: 0.8 }
        })
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Upload failed. Please try again.')
      toast.error('Upload failed. Please check the file format.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border border-border bg-card/20 rounded-2xl p-6 relative overflow-hidden h-full flex flex-col justify-center">
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
            style={{ minHeight: '148px' }}
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
                className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md hover:bg-muted transition-colors disabled:opacity-40"
              >
                Change
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading & Parsing...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Upload Requirement Document
                  </>
                )}
              </button>
              <button
                onClick={() => setFile(null)}
                disabled={uploading}
                className="p-2.5 border border-border rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
