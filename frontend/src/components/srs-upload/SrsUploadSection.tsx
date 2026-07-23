'use client'

import React, { useState, useEffect } from 'react'
import { Link2 } from 'lucide-react'
import { SrsDocument, Project } from '../../types'
import { useConnectJiraMutation } from '../../mutations/jira.mutation'
import { useConnectLinearMutation } from '../../mutations/linear.mutation'
import { FileUploadTab } from './FileUploadTab'
import { JiraConnectionForm } from './JiraConnectionForm'
import { JiraIssueExplorer } from './JiraIssueExplorer'
import { LinearConnectionForm } from './LinearConnectionForm'
import { LinearIssueExplorer } from './LinearIssueExplorer'
import { FigmaConnectionForm } from './FigmaConnectionForm'

interface SrsUploadSectionProps {
  projectId: string
  srsDocuments: SrsDocument[]
  project?: Project | null
  onSrsUploaded: (updatedProject: unknown) => void
  mode?: 'upload' | 'jira' | 'linear'
}

/**
 * SRS Upload Section — container that provides tab navigation between
 * file upload, Jira import, and Linear import.
 * 
 * Each tab delegates to its own sub-component which handles its own
 * data fetching via TanStack Query.
 */
export function SrsUploadSection({ projectId, srsDocuments, project, onSrsUploaded, mode }: SrsUploadSectionProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'jira' | 'linear'>((mode as any) || 'upload')

  useEffect(() => {
    if (mode) setActiveTab(mode as any)
  }, [mode])

  const jiraConnected = !!project?.jiraConnected
  const linearConnected = !!project?.linearConnected

  const connectJiraMutation = useConnectJiraMutation(projectId)
  const connectLinearMutation = useConnectLinearMutation(projectId)

  const handleJiraConnect = (payload: { host: string; email: string; token: string; projectKey: string }) => {
    connectJiraMutation.mutate(payload, {
      onSuccess: (data) => onSrsUploaded(data.data)
    })
  }

  const handleLinearConnect = (payload: { apiKey: string; teamId: string }) => {
    connectLinearMutation.mutate(payload, {
      onSuccess: (data) => onSrsUploaded(data.data)
    })
  }

  return (
    <div className="border border-border bg-card/20 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-center">
      {/* Tab Navigation */}
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
            Upload Document / Connect Figma
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

      {/* Tab Content */}
      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-2.5">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
              Upload SRS Document <span className="text-muted-foreground font-normal">(Optional)</span>
            </h4>
            <FileUploadTab projectId={projectId} onSrsUploaded={onSrsUploaded} />
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-border/60 pt-5 lg:pt-0 lg:pl-6 space-y-2.5">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">
              Connect Figma Design <span className="text-muted-foreground font-normal">(Optional)</span>
            </h4>
            <FigmaConnectionForm
              projectId={projectId}
              initialUrl={project?.figmaFileUrl}
              syncedFrames={project?.figmaSyncedFrames}
            />
          </div>
        </div>
      )}

      {activeTab === 'jira' && (
        jiraConnected && project ? (
          <JiraIssueExplorer
            projectId={projectId}
            jiraHost={project.jiraHost || ''}
            jiraEmail={project.jiraEmail || ''}
            jiraProjectKey={project.jiraProjectKey || ''}
            onSrsUploaded={onSrsUploaded}
          />
        ) : (
          <JiraConnectionForm
            projectId={projectId}
            onConnect={handleJiraConnect}
            connecting={connectJiraMutation.isPending}
          />
        )
      )}

      {activeTab === 'linear' && (
        linearConnected && project ? (
          <LinearIssueExplorer
            projectId={projectId}
            linearTeamId={project.linearTeamId || ''}
            onSrsUploaded={onSrsUploaded}
          />
        ) : (
          <LinearConnectionForm
            projectId={projectId}
            onConnect={handleLinearConnect}
            connecting={connectLinearMutation.isPending}
          />
        )
      )}
    </div>
  )
}
