'use client'

import React from 'react'
import { FileText, Link2, AlertCircle, MessageSquare } from 'lucide-react'
import { Project, RequirementAnalysis, TestSuiteData } from '../../types'
import { SrsUploadSection } from '../srs-upload'
import { SlackConnectionForm } from '../srs-upload/SlackConnectionForm'
import { DocumentsTable } from './DocumentsTable'

interface OverviewDashboardProps {
  project: Project
  dashboardTab: 'srs' | 'jira' | 'linear' | 'slack'
  setDashboardTab: (tab: 'srs' | 'jira' | 'linear' | 'slack') => void
  srsDocs: any[]
  jiraDocs: any[]
  linearDocs: any[]
  requirementAnalyses: RequirementAnalysis[]
  testSuites: TestSuiteData[]
  agentError: string | null
  agentRunning: string | null
  runningActionDocId: string | null
  onRunAgent0: (docId: string) => void
  onRunAgent1: (docId: string) => void
  onRunAgent2: (docId: string) => void
  onRefreshProject: () => void
}

/**
 * Overview dashboard displaying project header, tabs for SRS / Jira / Linear / Slack, SRS upload section, and documents table.
 */
export function OverviewDashboard({
  project,
  dashboardTab,
  setDashboardTab,
  srsDocs,
  jiraDocs,
  linearDocs,
  requirementAnalyses,
  testSuites,
  agentError,
  agentRunning,
  runningActionDocId,
  onRunAgent0,
  onRunAgent1,
  onRunAgent2,
  onRefreshProject,
}: OverviewDashboardProps) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Project Header */}
      <div className="space-y-2 pb-2 border-b border-border/40">
        <span className="text-xs font-bold text-primary tracking-wider uppercase">Active Project</span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground capitalize">
          {project.projectName}
        </h1>
        {project.projectDescription && (
          <p className="text-sm text-muted-foreground max-w-xl capitalize">
            {project.projectDescription}
          </p>
        )}
      </div>

      {agentError && (
        <div className="border border-border bg-muted/40 text-muted-foreground p-4 rounded-xl flex items-center gap-3 text-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          {agentError}
        </div>
      )}

      {/* ── Main Tabs ── */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          <button
            onClick={() => setDashboardTab('srs')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              dashboardTab === 'srs'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <FileText className="w-4 h-4" />
            SRS Documents
            {srsDocs.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  dashboardTab === 'srs'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {srsDocs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setDashboardTab('jira')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              dashboardTab === 'jira'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Jira Tickets
            {jiraDocs.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  dashboardTab === 'jira'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {jiraDocs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setDashboardTab('linear')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              dashboardTab === 'linear'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Linear Stories
            {linearDocs.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  dashboardTab === 'linear'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {linearDocs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setDashboardTab('slack')}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              dashboardTab === 'slack'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Slack Channel
            {project.slackConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>
        </div>
      </div>

      {/* ── Tab Content ── */}
      {dashboardTab === 'srs' ? (
        <div className="space-y-5 animate-fadeIn">
          <SrsUploadSection
            projectId={project._id}
            srsDocuments={project.srsDocuments ?? []}
            project={project}
            mode="upload"
            onSrsUploaded={onRefreshProject}
          />
          <DocumentsTable
            docs={srsDocs}
            isJira={false}
            requirementAnalyses={requirementAnalyses}
            testSuites={testSuites}
            agentRunning={agentRunning}
            runningActionDocId={runningActionDocId}
            onRunAgent0={onRunAgent0}
            onRunAgent1={onRunAgent1}
            onRunAgent2={onRunAgent2}
          />
        </div>
      ) : dashboardTab === 'jira' ? (
        <div className="space-y-5 animate-fadeIn">
          <SrsUploadSection
            projectId={project._id}
            srsDocuments={project.srsDocuments ?? []}
            project={project}
            mode="jira"
            onSrsUploaded={onRefreshProject}
          />
          <DocumentsTable
            docs={jiraDocs}
            isJira={true}
            requirementAnalyses={requirementAnalyses}
            testSuites={testSuites}
            agentRunning={agentRunning}
            runningActionDocId={runningActionDocId}
            onRunAgent0={onRunAgent0}
            onRunAgent1={onRunAgent1}
            onRunAgent2={onRunAgent2}
          />
        </div>
      ) : dashboardTab === 'linear' ? (
        <div className="space-y-5 animate-fadeIn">
          <SrsUploadSection
            projectId={project._id}
            srsDocuments={project.srsDocuments ?? []}
            project={project}
            mode="linear"
            onSrsUploaded={onRefreshProject}
          />
          <DocumentsTable
            docs={linearDocs}
            isJira={true}
            requirementAnalyses={requirementAnalyses}
            testSuites={testSuites}
            agentRunning={agentRunning}
            runningActionDocId={runningActionDocId}
            onRunAgent0={onRunAgent0}
            onRunAgent1={onRunAgent1}
            onRunAgent2={onRunAgent2}
          />
        </div>
      ) : (
        <div className="animate-fadeIn">
          <div className="border border-border bg-card/20 rounded-2xl p-6 max-w-xl">
            <h3 className="font-bold text-sm text-foreground mb-1">Configure Project Slack Channel</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Select the Slack channel where test suite approval requests and review notifications will be posted for this project.
            </p>
            <SlackConnectionForm
              projectId={project._id}
              slackChannelId={project.slackChannelId}
              slackChannelName={project.slackChannelName}
              slackConnected={project.slackConnected}
              onUpdated={onRefreshProject}
            />
          </div>
        </div>
      )}
    </div>
  )
}

