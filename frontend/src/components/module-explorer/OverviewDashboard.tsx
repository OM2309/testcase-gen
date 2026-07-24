'use client'

import React, { useMemo } from 'react'
import { FileText, Link2, AlertCircle } from 'lucide-react'
import { Project, RequirementAnalysis, TestSuiteData } from '../../types'
import { SrsUploadSection } from '../srs-upload'
import { DocumentsTable } from './DocumentsTable'

interface OverviewDashboardProps {
  project: Project
  dashboardTab: 'srs' | 'jira' | 'linear'
  setDashboardTab: (tab: 'srs' | 'jira' | 'linear') => void
  srsDocs: any[]
  jiraDocs: any[]
  linearDocs: any[]
  requirementAnalyses: RequirementAnalysis[]
  testSuites: TestSuiteData[]
  agentError: string | null
  agentRunning: string | null
  runningActionDocId: string | null
  onRunAgent0: (docId: string) => void
  onRunAgent1: (docId: string, mode?: string) => void
  onRunAgent2: (docId: string) => void
  onRefreshProject: () => void
  hasFigma?: boolean
}

/**
 * Overview dashboard displaying project header, tabs for SRS / Jira / Linear, SRS upload section, and documents table.
 * When Figma designs are connected, a virtual Figma entry is shown alongside SRS docs allowing direct module generation.
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
  hasFigma = false,
}: OverviewDashboardProps) {
  // Build a virtual Figma doc entry when Figma designs are synced and there are no SRS docs
  // (Figma-only scenario). When SRS docs exist, they automatically get hybrid mode.
  const figmaDoc = useMemo(() => {
    if (!hasFigma) return null
    const frameCount = project.figmaSyncedFrames?.length || 0
    return {
      _id: 'figma-design',
      originalFileName: `Figma Designs (${frameCount} screens)`,
      filePath: 'virtual://figma',
      parsedText: '',
      uploadedAt: project.createdAt,
    }
  }, [hasFigma, project.figmaSyncedFrames, project.createdAt])

  // Merge Figma doc into srsDocs list for the SRS tab
  const srsDocsWithFigma = useMemo(() => {
    if (!figmaDoc) return srsDocs
    // Add Figma entry at the end of the SRS docs list
    return [...srsDocs, figmaDoc]
  }, [srsDocs, figmaDoc])

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

      {/* ── Tabs ── */}
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
            {srsDocsWithFigma.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                  dashboardTab === 'srs'
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {srsDocsWithFigma.length}
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
            docs={srsDocsWithFigma}
            isJira={false}
            hasFigma={hasFigma}
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
            hasFigma={hasFigma}
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
            hasFigma={hasFigma}
            requirementAnalyses={requirementAnalyses}
            testSuites={testSuites}
            agentRunning={agentRunning}
            runningActionDocId={runningActionDocId}
            onRunAgent0={onRunAgent0}
            onRunAgent1={onRunAgent1}
            onRunAgent2={onRunAgent2}
          />
        </div>
      )}
    </div>
  )
}
