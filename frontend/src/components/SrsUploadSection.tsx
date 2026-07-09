'use client'

import React, { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { uploadService, SrsDocument } from '../services/uploadService'
import {
  Upload, FileText, Loader2, AlertCircle, CheckCircle2,
  UploadCloud, Clock, Plus, ChevronDown, ChevronUp, Trash2
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
  const [showDocs, setShowDocs] = useState(true)
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
    <div className="border border-border bg-card/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-muted/20 transition-colors"
        onClick={() => setShowDocs(!showDocs)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <UploadCloud className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Requirement Documents</h3>
            <p className="text-[11px] text-muted-foreground">
              {srsDocuments.length === 0
                ? 'No documents uploaded yet'
                : `${srsDocuments.length} document${srsDocuments.length > 1 ? 's' : ''} uploaded`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {srsDocuments.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400">
              <FileText className="w-2.5 h-2.5" />
              {srsDocuments.length}
            </span>
          )}
          <div className="text-muted-foreground">
            {showDocs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {showDocs && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/40">
          {/* Existing SRS list */}
          {srsDocuments.length > 0 && (
            <div className="space-y-2 pt-4">
              {srsDocuments.map((doc, idx) => (
                <div
                  key={doc._id}
                  className="flex items-center gap-3 p-3 border border-border/60 bg-muted/10 rounded-xl"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        Doc {idx + 1}
                      </span>
                      <p className="text-xs font-semibold text-foreground truncate">{doc.originalFileName}</p>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(doc.uploadedAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold flex-shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Parsed
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Upload new SRS */}
          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" />
              {srsDocuments.length === 0 ? 'Upload First Requirement Document' : 'Upload Another Requirement Document'}
            </p>

            {error && (
              <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-3 rounded-xl flex items-center gap-2 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 p-3 rounded-xl flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                Requirement document uploaded and parsed successfully!
              </div>
            )}

            {!file ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-3 ${dragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40 bg-muted/5 hover:bg-muted/10'
                  }`}
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
                  <p className="text-sm font-semibold">Drop requirement file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PDF, DOC or DOCX — up to 5MB</p>
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
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
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
      )}
    </div>
  )
}
