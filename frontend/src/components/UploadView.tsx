'use client'

import React, { useState, useRef } from 'react'
import { uploadService } from '../services/uploadService'
import { agentService } from '../services/agentService'
import { Upload, FileText, ArrowRight, Loader, AlertCircle } from 'lucide-react'

interface UploadViewProps {
  onAnalysisComplete: (projectId: string, requirements: any) => void
}

export function UploadView({ onAnalysisComplete }: UploadViewProps) {
  const [file, setFile] = useState<File | null>(null)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [parsedText, setParsedText] = useState('')
  const [status, setStatus] = useState<'idle' | 'uploading' | 'parsed' | 'analyzing'>('idle')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      await uploadFile(droppedFile)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      await uploadFile(selectedFile)
    }
  }

  const uploadFile = async (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      setError('Invalid file type. Only PDF and DOCX files are accepted.')
      return
    }

    try {
      setError(null)
      setFile(selectedFile)
      setStatus('uploading')

      const res = await uploadService.uploadSRS(selectedFile)
      if (res.success) {
        setDocumentId(res.documentId)
        setParsedText(res.text)
        setStatus('parsed')
      } else {
        setError('Upload failed. Please try again.')
        setStatus('idle')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to parse file text.')
      setStatus('idle')
    }
  }

  const handleAnalyze = async () => {
    if (!documentId) return
    try {
      setError(null)
      setStatus('analyzing')
      const res = await agentService.analyzePRD(documentId, parsedText)
      if (res.success) {
        onAnalysisComplete(res.requirementId, res.requirements)
      } else {
        setError('Analysis failed.')
        setStatus('parsed')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to complete requirement analysis.')
      setStatus('parsed')
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload PRD / SRS Specification</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload your software requirements document. The system will parse it and run Agent 1 to build a structured JSON representation.</p>
      </div>

      {error && (
        <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-4 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {status === 'idle' || status === 'uploading' ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed border-border hover:border-primary/50 bg-card/25 rounded-2xl p-16 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-4 min-h-[300px] ${status === 'uploading' ? 'pointer-events-none opacity-80' : ''}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx"
            className="hidden"
          />
          {status === 'uploading' ? (
            <>
              <Loader className="w-10 h-10 text-primary animate-spin" />
              <div>
                <p className="font-semibold text-base">Uploading and parsing document...</p>
                <p className="text-xs text-muted-foreground mt-1">Extracting raw text from {file?.name}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">Drag & drop your requirements file here</p>
                <p className="text-sm text-muted-foreground mt-1">Or click to browse from your computer</p>
              </div>
              <p className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-md mt-2">Accepted formats: PDF, DOCX (Max 25MB)</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-border bg-card rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <h4 className="font-semibold text-sm">{file?.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{(file?.size ? file.size / (1024 * 1024) : 0).toFixed(2)} MB • Text extracted successfully</p>
              </div>
            </div>
            <button
              onClick={() => {
                setStatus('idle')
                setFile(null)
                setDocumentId(null)
                setParsedText('')
              }}
              disabled={status === 'analyzing'}
              className="text-xs font-semibold px-3 py-1.5 hover:bg-muted rounded-md transition-colors"
            >
              Replace File
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold block">Parsed PRD Content (Editable)</label>
            <textarea
              value={parsedText}
              onChange={(e) => setParsedText(e.target.value)}
              disabled={status === 'analyzing'}
              rows={12}
              className="w-full bg-card border border-border rounded-xl p-4 text-sm font-mono focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => handleAnalyze()}
              disabled={status === 'analyzing'}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold disabled:opacity-60"
            >
              {status === 'analyzing' ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" /> Analyzing requirements...
                </>
              ) : (
                <>
                  Analyze PRD <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
