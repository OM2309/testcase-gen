'use client'

import React, { useState, useEffect } from 'react'
import { Search, RefreshCw, UploadCloud, Loader2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { JiraIssue } from '../../types'
import { useJiraIssuesQuery } from '../../queries/jira.query'
import { useImportJiraStoriesMutation, useDisconnectJiraMutation } from '../../mutations/jira.mutation'
import { IssueListItem } from './IssueListItem'

interface JiraIssueExplorerProps {
  projectId: string
  jiraHost: string
  jiraEmail: string
  jiraProjectKey: string
  onSrsUploaded: (data: unknown) => void
}

/**
 * Jira issue explorer — shows connected status, search, issue list, and import button.
 */
export function JiraIssueExplorer({ projectId, jiraHost, jiraEmail, jiraProjectKey, onSrsUploaded }: JiraIssueExplorerProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedIssues, setSelectedIssues] = useState<string[]>([])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 450)
    return () => clearTimeout(timer)
  }, [search])

  const { data: issues = [], isLoading } = useJiraIssuesQuery(projectId, debouncedSearch, true)
  const importMutation = useImportJiraStoriesMutation(projectId)
  const disconnectMutation = useDisconnectJiraMutation(projectId)

  const toggleIssue = (key: string) => {
    setSelectedIssues(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleImport = () => {
    if (selectedIssues.length === 0) return
    importMutation.mutate(selectedIssues, {
      onSuccess: (data) => {
        setSelectedIssues([])
        onSrsUploaded(data.data)
      }
    })
  }

  const handleDisconnect = () => {
    disconnectMutation.mutate(undefined, {
      onSuccess: (data) => onSrsUploaded(data.data)
    })
  }

  return (
    <div className="space-y-3.5">
      {/* Connection Status */}
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
            onClick={() => setDebouncedSearch(search)}
            disabled={isLoading}
            className="p-1.5 border border-border rounded-lg bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Reload Backlog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleDisconnect}
            className="px-2.5 py-1.5 border border-border rounded-lg bg-background hover:bg-red-50 text-red-600 font-semibold cursor-pointer select-none transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter stories by ID key or keywords..."
          className="w-full pl-9 pr-4 py-2 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      {/* Issues List */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (issues as JiraIssue[]).length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6 italic border border-dashed border-border rounded-xl">
          No active stories found matching your filter criteria.
        </p>
      ) : (
        <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
          {(issues as JiraIssue[]).map(issue => (
            <IssueListItem
              key={issue.key}
              issue={issue}
              isSelected={selectedIssues.includes(issue.key)}
              onToggle={toggleIssue}
              externalUrl={`${jiraHost}/browse/${issue.key}`}
            />
          ))}
        </div>
      )}

      {/* Import Button */}
      {selectedIssues.length > 0 && (
        <button
          onClick={handleImport}
          disabled={importMutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-1.5 cursor-pointer mt-1 font-bold text-xs"
        >
          {importMutation.isPending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing & Launching AI Agents...</>
          ) : (
            <><UploadCloud className="w-3.5 h-3.5" /> Import & Generate from {selectedIssues.length} Stories</>
          )}
        </button>
      )}
    </div>
  )
}
