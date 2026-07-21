'use client'

import React, { useState, useRef, useEffect } from 'react'
import { uploadService, SrsDocument } from '../services/uploadService'
import { projectService } from '../services/projectService'
import {
  Upload, FileText, Loader2, AlertCircle, CheckCircle2,
  UploadCloud, Trash2, Link2, Search, ExternalLink, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { Skeleton } from '@/components/ui/skeleton'

interface SrsUploadSectionProps {
  projectId: string
  srsDocuments: SrsDocument[]
  project?: any
  onSrsUploaded: (updatedProject: any) => void
  mode?: 'upload' | 'jira' | 'linear'
}

export function SrsUploadSection({ projectId, srsDocuments, project, onSrsUploaded, mode }: SrsUploadSectionProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'jira' | 'linear'>(mode || 'upload')

  useEffect(() => {
    if (mode) {
      setActiveTab(mode)
    }
  }, [mode])
  
  // File Upload states
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Jira Connection states (Pre-filled with user's Jira info)
  const [jiraConnected, setJiraConnected] = useState(false)
  const [jiraHost, setJiraHost] = useState(process.env.NEXT_PUBLIC_JIRA_HOST || '')
  const [jiraEmail, setJiraEmail] = useState(process.env.NEXT_PUBLIC_JIRA_EMAIL || '')
  const [jiraToken, setJiraToken] = useState(process.env.NEXT_PUBLIC_JIRA_TOKEN || '')
  const [jiraProjectKey, setJiraProjectKey] = useState(process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || '')
  const [connectingJira, setConnectingJira] = useState(false)

  // Jira Issues Explorer states
  const [jiraIssues, setJiraIssues] = useState<any[]>([])
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [selectedIssues, setSelectedIssues] = useState<string[]>([])
  const [issueSearch, setIssueSearch] = useState('')
  const [importingIssues, setImportingIssues] = useState(false)

  // Linear Connection states
  const [linearConnected, setLinearConnected] = useState(false)
  const [linearApiKey, setLinearApiKey] = useState(process.env.NEXT_PUBLIC_LINEAR_API_KEY || '')
  const [linearTeamId, setLinearTeamId] = useState(process.env.NEXT_PUBLIC_LINEAR_TEAM_ID || '')
  const [connectingLinear, setConnectingLinear] = useState(false)

  // Linear Issues Explorer states
  const [linearIssues, setLinearIssues] = useState<any[]>([])
  const [loadingLinearIssues, setLoadingLinearIssues] = useState(false)
  const [selectedLinearIssues, setSelectedLinearIssues] = useState<string[]>([])
  const [linearIssueSearch, setLinearIssueSearch] = useState('')
  const [importingLinearIssues, setImportingLinearIssues] = useState(false)

  // Sync Jira & Linear state with active project config
  useEffect(() => {
    if (project) {
      if (project.jiraConnected) {
        setJiraConnected(true)
        setJiraHost(project.jiraHost || process.env.NEXT_PUBLIC_JIRA_HOST || '')
        setJiraEmail(project.jiraEmail || process.env.NEXT_PUBLIC_JIRA_EMAIL || '')
        setJiraProjectKey(project.jiraProjectKey || process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || '')
        fetchIssuesList()
      } else {
        setJiraConnected(false)
      }

      if (project.linearConnected) {
        setLinearConnected(true)
        setLinearTeamId(project.linearTeamId || process.env.NEXT_PUBLIC_LINEAR_TEAM_ID || '')
        fetchLinearIssuesList()
      } else {
        setLinearConnected(false)
      }
    }
  }, [project])

  const fetchIssuesList = async (searchQuery: string = '') => {
    setLoadingIssues(true)
    try {
      const res = await projectService.getJiraIssues(projectId, searchQuery)
      if (res.success && res.data) {
        setJiraIssues(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch Jira issues list', err)
    } finally {
      setLoadingIssues(false)
    }
  }

  const fetchLinearIssuesList = async (searchQuery: string = '') => {
    setLoadingLinearIssues(true)
    try {
      const res = await projectService.getLinearIssues(projectId, searchQuery)
      if (res.success && res.data) {
        setLinearIssues(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch Linear issues list', err)
    } finally {
      setLoadingLinearIssues(false)
    }
  }

  // Trigger search fetch
  useEffect(() => {
    if (jiraConnected) {
      const timer = setTimeout(() => {
        fetchIssuesList(issueSearch)
      }, 450)
      return () => clearTimeout(timer)
    }
  }, [issueSearch, jiraConnected])

  useEffect(() => {
    if (linearConnected) {
      const timer = setTimeout(() => {
        fetchLinearIssuesList(linearIssueSearch)
      }, 450)
      return () => clearTimeout(timer)
    }
  }, [linearIssueSearch, linearConnected])

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

  // Jira submit connect
  const handleConnectJira = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jiraHost.trim() || !jiraEmail.trim() || !jiraToken.trim() || !jiraProjectKey.trim()) {
      toast.error('Please fill in all connection credentials.')
      return
    }
    setConnectingJira(true)
    try {
      const res = await projectService.connectJira(projectId, {
        host: jiraHost.trim(),
        email: jiraEmail.trim(),
        token: jiraToken.trim(),
        projectKey: jiraProjectKey.trim()
      })
      if (res.success) {
        setJiraConnected(true)
        toast.success('Successfully connected to Jira Project KAN! 🔗')
        onSrsUploaded(res.data)
        fetchIssuesList()
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Connection to Jira failed. Please verify credentials.'
      toast.error(msg)
    } finally {
      setConnectingJira(false)
    }
  }

  // Jira disconnect project settings
  const handleDisconnectJira = async () => {
    try {
      const res = await projectService.connectJira(projectId, {
        host: '',
        email: '',
        token: '',
        projectKey: ''
      })
      setJiraConnected(false)
      setJiraIssues([])
      setSelectedIssues([])
      onSrsUploaded(res.data)
      toast.info('Disconnected Jira account successfully.')
    } catch (err) {
      toast.error('Failed to disconnect Jira.')
    }
  }

  // Handle select checklist toggles
  const handleSelectIssue = (key: string) => {
    setSelectedIssues(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Trigger stories import
  const handleImportJiraStories = async () => {
    if (selectedIssues.length === 0) return
    setImportingIssues(true)
    try {
      const res = await projectService.importJiraStories(projectId, selectedIssues)
      if (res.success) {
        toast.success(`Imported ${selectedIssues.length} user stories. AI parsing initiated! 🚀`)
        setSelectedIssues([])
        onSrsUploaded(res.data)
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.8 }
        })
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed.')
    } finally {
      setImportingIssues(false)
    }
  }

  // Linear submit connect
  const handleConnectLinear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linearApiKey.trim() || !linearTeamId.trim()) {
      toast.error('Please fill in Linear API Key and Team Key/ID.')
      return
    }
    setConnectingLinear(true)
    try {
      const res = await projectService.connectLinear(projectId, {
        apiKey: linearApiKey.trim(),
        teamId: linearTeamId.trim()
      })
      if (res.success) {
        setLinearConnected(true)
        toast.success(`Successfully connected to Linear Team "${linearTeamId.trim()}"! ⚡`)
        onSrsUploaded(res.data)
        fetchLinearIssuesList()
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Connection to Linear failed. Please verify credentials.'
      toast.error(msg)
    } finally {
      setConnectingLinear(false)
    }
  }

  // Linear disconnect project settings
  const handleDisconnectLinear = async () => {
    try {
      const res = await projectService.connectLinear(projectId, {
        apiKey: '',
        teamId: ''
      })
      setLinearConnected(false)
      setLinearIssues([])
      setSelectedLinearIssues([])
      onSrsUploaded(res.data)
      toast.info('Disconnected Linear workspace successfully.')
    } catch (err) {
      toast.error('Failed to disconnect Linear.')
    }
  }

  // Handle select Linear checklist toggles
  const handleSelectLinearIssue = (key: string) => {
    setSelectedLinearIssues(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Trigger Linear stories import
  const handleImportLinearStories = async () => {
    if (selectedLinearIssues.length === 0) return
    setImportingLinearIssues(true)
    try {
      const res = await projectService.importLinearStories(projectId, selectedLinearIssues)
      if (res.success) {
        toast.success(`Imported ${selectedLinearIssues.length} Linear user stories. AI parsing initiated! 🚀`)
        setSelectedLinearIssues([])
        onSrsUploaded(res.data)
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.8 }
        })
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Import failed.')
    } finally {
      setImportingLinearIssues(false)
    }
  }

  return (
    <div className="border border-border bg-card/20 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-center">
      {/* Top Tabs Selector Navigation */}
      {!mode && (
        <div className="flex border-b border-border mb-4 text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Upload Document File
          </button>
          <button
            onClick={() => setActiveTab('jira')}
            className={`pb-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'jira'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" /> Jira Cloud Import
          </button>
          <button
            onClick={() => setActiveTab('linear')}
            className={`pb-2 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'linear'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" /> Linear Import
          </button>
        </div>
      )}

      {activeTab === 'upload' ? (
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
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-primary flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Upload Document
                    </>
                  )}
                </button>
                <button
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  className="btn-secondary h-9 px-3"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'jira' ? (
        /* Jira Integration Screen */
        <div className="space-y-4">
          {!jiraConnected ? (
            /* Configure Settings Form */
            <form onSubmit={handleConnectJira} className="space-y-3.5 text-xs">
              <p className="text-[11px] text-muted-foreground">
                Connect this project directly to your Jira Cloud workspace to fetch user stories.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Jira Host URL</label>
                  <input
                    type="text"
                    value={jiraHost}
                    onChange={e => setJiraHost(e.target.value)}
                    placeholder="https://your-domain.atlassian.net"
                    className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Jira Project Key</label>
                  <input
                    type="text"
                    value={jiraProjectKey}
                    onChange={e => setJiraProjectKey(e.target.value)}
                    placeholder="e.g. KAN"
                    className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Atlassian Email</label>
                  <input
                    type="email"
                    value={jiraEmail}
                    onChange={e => setJiraEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Jira API Token</label>
                  <input
                    type="password"
                    value={jiraToken}
                    onChange={e => setJiraToken(e.target.value)}
                    placeholder="Atlassian Personal Token"
                    className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={connectingJira}
                className="btn-primary w-full flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                {connectingJira ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" />
                    Verify & Connect Jira Workspace
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Story Selection backlogs list view */
            <div className="space-y-3.5">
              <div className="border border-border bg-card rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                    KAN
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Connected to project {jiraProjectKey}</p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[240px] md:max-w-none">
                      {jiraHost.replace('https://', '')} ({jiraEmail})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchIssuesList(issueSearch)}
                    disabled={loadingIssues}
                    className="p-1.5 border border-border rounded-lg bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Reload Backlog"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingIssues ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleDisconnectJira}
                    className="px-2.5 py-1.5 border border-border rounded-lg bg-background hover:bg-red-50 text-red-600 font-semibold cursor-pointer select-none transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Stories Search Input */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={issueSearch}
                  onChange={e => setIssueSearch(e.target.value)}
                  placeholder="Filter stories by ID key or keywords..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              {/* Stories Checklist */}
              {loadingIssues ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : jiraIssues.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 italic border border-dashed border-border rounded-xl">
                  No active stories found matching your filter criteria.
                </p>
              ) : (
                <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                  {jiraIssues.map(issue => {
                    const isSelected = selectedIssues.includes(issue.key)
                    return (
                      <div
                        key={issue.key}
                        onClick={() => handleSelectIssue(issue.key)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer hover:bg-muted/40 transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Controlled by outer container click
                          className="mt-0.5 pointer-events-none"
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-primary flex items-center gap-0.5">
                              {issue.key}
                              <a
                                href={`${jiraHost}/browse/${issue.key}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-block hover:opacity-80"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </span>
                            <span className="font-semibold text-foreground">{issue.title}</span>
                          </div>
                          {issue.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {issue.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Action Buttons */}
              {selectedIssues.length > 0 && (
                <button
                  onClick={handleImportJiraStories}
                  disabled={importingIssues}
                  className="btn-primary w-full flex items-center justify-center gap-1.5 cursor-pointer mt-1 font-bold text-xs"
                >
                  {importingIssues ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Importing & Launching AI Agents...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      Import & Generate from {selectedIssues.length} Stories
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      ) : activeTab === 'linear' ? (
        /* Linear Integration Screen */
        <div className="space-y-4">
          {!linearConnected ? (
            /* Configure Linear Form */
            <form onSubmit={handleConnectLinear} className="space-y-3.5 text-xs">
              <p className="text-[11px] text-muted-foreground">
                Connect this project directly to your Linear workspace to fetch user stories.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Linear Personal API Key</label>
                  <input
                    type="password"
                    value={linearApiKey}
                    onChange={e => setLinearApiKey(e.target.value)}
                    placeholder="lin_api_..."
                    className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-foreground">Linear Team Key / ID</label>
                  <input
                    type="text"
                    value={linearTeamId}
                    onChange={e => setLinearTeamId(e.target.value)}
                    placeholder="e.g. NIO"
                    className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={connectingLinear}
                className="btn-primary w-full flex items-center justify-center gap-1.5 cursor-pointer mt-1"
              >
                {connectingLinear ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5" />
                    Verify & Connect Linear Workspace
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Story Selection backlogs list view */
            <div className="space-y-3.5">
              <div className="border border-border bg-card rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                    {linearTeamId}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Connected to Linear Team {linearTeamId}</p>
                    <p className="text-[10px] text-muted-foreground">
                      GraphQL API Active
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchLinearIssuesList(linearIssueSearch)}
                    disabled={loadingLinearIssues}
                    className="p-1.5 border border-border rounded-lg bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Reload Backlog"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingLinearIssues ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={handleDisconnectLinear}
                    className="px-2.5 py-1.5 border border-border rounded-lg bg-background hover:bg-red-50 text-red-600 font-semibold cursor-pointer select-none transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Stories Search Input */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={linearIssueSearch}
                  onChange={e => setLinearIssueSearch(e.target.value)}
                  placeholder="Filter Linear stories by ID or keywords..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              {/* Stories Checklist */}
              {loadingLinearIssues ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : linearIssues.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 italic border border-dashed border-border rounded-xl">
                  No active Linear stories found matching your filter criteria.
                </p>
              ) : (
                <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                  {linearIssues.map(issue => {
                    const isSelected = selectedLinearIssues.includes(issue.key)
                    return (
                      <div
                        key={issue.key}
                        onClick={() => handleSelectLinearIssue(issue.key)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer hover:bg-muted/40 transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // Controlled by outer container click
                          className="mt-0.5 pointer-events-none"
                        />
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-primary flex items-center gap-0.5">
                              {issue.key}
                              <a
                                href={`https://linear.app/issue/${issue.key}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="inline-block hover:opacity-80"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </span>
                            <span className="font-semibold text-foreground">{issue.title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                              {issue.state}
                            </span>
                          </div>
                          {issue.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                              {issue.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Action Buttons */}
              {selectedLinearIssues.length > 0 && (
                <button
                  onClick={handleImportLinearStories}
                  disabled={importingLinearIssues}
                  className="btn-primary w-full flex items-center justify-center gap-1.5 cursor-pointer mt-1 font-bold text-xs"
                >
                  {importingLinearIssues ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Importing & Launching AI Agents...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      Import & Generate from {selectedLinearIssues.length} Linear Stories
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
