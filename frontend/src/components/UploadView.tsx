'use client'

import React, { useState, useRef } from 'react'
import { uploadService } from '../services/uploadService'
import { Upload, FileText, CheckCircle2, AlertCircle, BrainCircuit, Loader2 } from 'lucide-react'

interface UploadViewProps {
  onProjectCreated: (projectId: string) => void
}

export function UploadView({ onProjectCreated }: UploadViewProps) {
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isValidFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    return ext === 'pdf' || ext === 'docx'
  }

  const selectFile = (f: File) => {
    if (!isValidFile(f)) {
      setError('Only PDF and DOCX files are accepted.')
      return
    }
    setError(null)
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) selectFile(dropped)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    if (!projectName.trim()) { setError('Project name is required.'); return }

    try {
      setError(null)
      setStatus('uploading')
      const res = await uploadService.createProject(file, projectName.trim(), projectDescription.trim())
      if (res.success) {
        setStatus('done')
        setTimeout(() => onProjectCreated(res.data._id), 800)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.')
      setStatus('idle')
    }
  }

  if (status === 'uploading') {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] gap-8 text-center">
        <div className="relative flex items-center justify-center w-32 h-32">
          {/* Animated rings */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
          <div className="absolute inset-4 rounded-full border-4 border-primary/40 animate-pulse" />
          <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
            <BrainCircuit className="w-9 h-9 text-primary animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Processing Document</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Uploading and extracting text from <span className="font-semibold text-foreground">{file?.name}</span>. This takes a few seconds...
          </p>
        </div>
        <div className="w-72 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-[progress_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Parsing document content...</span>
        </div>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold">Project Created!</h2>
          <p className="text-sm text-muted-foreground">Redirecting to requirements workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload a PRD or SRS document to begin AI-powered test generation.</p>
      </div>

      {error && (
        <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground block">Project Name <span className="text-rose-400">*</span></label>
          <input
            type="text"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="e.g. Todo Application v2"
            className="w-full px-4 py-3 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition placeholder:text-muted-foreground"
          />
        </div>

        {/* Project Description */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground block">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
          <textarea
            value={projectDescription}
            onChange={e => setProjectDescription(e.target.value)}
            placeholder="Brief description of what this project covers..."
            rows={3}
            className="w-full px-4 py-3 text-sm bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition resize-none placeholder:text-muted-foreground"
          />
        </div>

        {/* File Upload Zone */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground block">Requirements Document <span className="text-rose-400">*</span></label>

          {!file ? (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all flex flex-col items-center gap-4 ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-card/20'}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={e => e.target.files?.[0] && selectFile(e.target.files[0])}
                accept=".pdf,.docx"
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">Drop your file here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports PDF and DOCX — up to 25MB</p>
              </div>
            </div>
          ) : (
            <div className="border border-border bg-card rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!file || !projectName.trim()}
          className="w-full py-3 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Create Project & Upload Document
        </button>
      </form>
    </div>
  )
}
