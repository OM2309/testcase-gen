'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, FileSpreadsheet, PlayCircle, Loader2, Sparkles, Layers } from 'lucide-react'
import {
  ModuleGroup,
  TestCase,
  RequirementAnalysis,
  TestSuiteData,
} from '../../types'
import { AccuracyScoreCard } from './AccuracyScoreCard'
import { ModuleNavigationList } from './ModuleNavigationList'
import { ActiveModulePanel } from './ActiveModulePanel'

interface DetailViewProps {
  selectedSrs: any
  selectedSrsModules: ModuleGroup[]
  selectedAnalysis: RequirementAnalysis | null
  selectedSuite: TestSuiteData | null
  activeModuleName: string | null
  setActiveModuleName: (name: string) => void
  projectId: string
  agentRunning: string | null
  runningActionDocId: string | null
  onRunAgent0: (docId: string) => void
  onRunAgent1: (docId: string, mode?: string) => void
  onRunAgent2: (docId: string) => void
  hasFigma?: boolean
  onOpenGapFill?: () => void
  onExportExcel: (fileName: string, modules: ModuleGroup[]) => void
  onOpenRunDialog: (
    type: 'project' | 'module' | 'feature' | 'testcase' | 'srs',
    name: string,
    testCases: TestCase[],
    suiteId?: string
  ) => void
}

/**
 * Detail view when an SRS document or story is selected. Displays parsed text, accuracy score card, and module navigator.
 */
export function DetailView({
  selectedSrs,
  selectedSrsModules,
  selectedAnalysis,
  selectedSuite,
  activeModuleName,
  setActiveModuleName,
  projectId,
  agentRunning,
  runningActionDocId,
  onRunAgent0,
  onRunAgent1,
  onRunAgent2,
  onOpenGapFill,
  onExportExcel,
  onOpenRunDialog,
  hasFigma = false,
}: DetailViewProps) {
  const router = useRouter()
  const activeMod = selectedSrsModules.find((m: ModuleGroup) => m.name === activeModuleName)

  const isFigmaOnly = selectedSrs?._id === 'figma-design'
  const isScored = selectedAnalysis && selectedAnalysis.agent0Status === 'completed' && selectedAnalysis.agent0Score != null
  const isModulesExtracted = selectedSrsModules && selectedSrsModules.length > 0

  // Determine the generation mode for Agent 1
  const getAgent1Mode = (): string => {
    if (isFigmaOnly) return 'figma_only'
    if (hasFigma) return 'srs_and_figma'
    return 'srs_only'
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Back + Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(window.location.pathname)}
            className="h-9 w-9 p-0 border border-gray-300 cursor-pointer rounded-lg flex items-center justify-center hover:bg-muted/40 transition-colors"
            title="Back to Overview"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <span className="text-xs font-bold text-primary tracking-wider uppercase">
              {isFigmaOnly ? 'Figma Design View' : 'Document View'}
            </span>
            <h1 className="text-xl font-bold text-foreground capitalize mt-0.5">
              {selectedSrs.originalFileName || 'Requirement Specification'}
            </h1>
          </div>
        </div>

        {selectedSuite && selectedSuite.testCases?.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenGapFill && (
              <button
                onClick={onOpenGapFill}
                disabled={agentRunning !== null}
                className="btn-secondary h-9 px-3 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                {agentRunning === 'gapfill' && runningActionDocId === selectedSrs._id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing Gaps...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    {selectedAnalysis?.gapFillData ? 'Missing Test Cases' : 'Generate Missing Test Cases'}
                  </>
                )}
              </button>
            )}
            <button
              onClick={() =>
                onExportExcel(selectedSrs.originalFileName, selectedSrsModules)
              }
              className="btn-secondary cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Export Excel
            </button>
            <button
              onClick={() => {
                const allDocTcs = selectedSrsModules.flatMap((m) =>
                  m.features.flatMap((f) => f.testCases)
                )
                onOpenRunDialog(
                  'srs',
                  selectedSrs.originalFileName,
                  allDocTcs,
                  selectedSuite._id
                )
              }}
              className="btn-primary cursor-pointer"
            >
              <PlayCircle className="w-4.5 h-4.5" /> Run Suite (
              {selectedSrsModules.reduce(
                (acc: number, m: ModuleGroup) => acc + m.testCasesCount,
                0
              )}
              )
            </button>
          </div>
        ) : isFigmaOnly ? (
          /* Figma-only: skip scoring, go directly to module extraction */
          !isModulesExtracted ? (
            <button
              disabled={agentRunning !== null}
              onClick={() => onRunAgent1(selectedSrs._id, 'figma_only')}
              className="btn-primary h-9 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {agentRunning === 'agent1' && runningActionDocId === selectedSrs._id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting from Figma...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Generate Modules from Figma
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                disabled={agentRunning !== null}
                onClick={() => onRunAgent2(selectedSrs._id)}
                className="btn-primary h-9 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {agentRunning === 'agent2' && runningActionDocId === selectedSrs._id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating test cases...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" /> Generate Test Suite
                  </>
                )}
              </button>
            </div>
          )
        ) : !isScored ? (
          <button
            disabled={agentRunning !== null}
            onClick={() => onRunAgent0(selectedSrs._id)}
            className="btn-primary h-9 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            {agentRunning === 'agent0' && runningActionDocId === selectedSrs._id ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scoring document...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Analyze Document
              </>
            )}
          </button>
        ) : !isModulesExtracted ? (
          <button
            disabled={agentRunning !== null}
            onClick={() => onRunAgent1(selectedSrs._id, getAgent1Mode())}
            className="btn-primary h-9 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            {agentRunning === 'agent1' && runningActionDocId === selectedSrs._id ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting modules...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" /> Generate Modules
                {hasFigma && (
                  <span className="ml-0.5 text-[8px] font-bold text-purple-500 uppercase">+ Figma</span>
                )}
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenGapFill && (
              <button
                onClick={onOpenGapFill}
                disabled={agentRunning !== null}
                className="btn-secondary h-9 px-3 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                {agentRunning === 'gapfill' && runningActionDocId === selectedSrs._id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing Gaps...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    {selectedAnalysis?.gapFillData ? 'Missing Test Cases' : 'Generate Missing Test Cases'}
                  </>
                )}
              </button>
            )}
            <button
              disabled={agentRunning !== null}
              onClick={() => onRunAgent2(selectedSrs._id)}
              className="btn-primary h-9 px-4 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {agentRunning === 'agent2' && runningActionDocId === selectedSrs._id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating test cases...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Generate Test Suite
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Parsed Text Preview */}
      {selectedSrs.parsedText && (
        <div className="border border-border bg-card/20 rounded-xl p-4 space-y-2">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Document Content / Story Details
          </h3>
          <div className="bg-background/80 border border-border/60 rounded-lg p-3.5 max-h-[200px] overflow-y-auto font-mono text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {selectedSrs.parsedText}
          </div>
        </div>
      )}

      {/* Accuracy Score Card — hidden for Figma-only analyses */}
      {!isFigmaOnly && selectedAnalysis &&
        selectedAnalysis.agent0Score != null && (
          <AccuracyScoreCard analysis={selectedAnalysis} onOpenGapFill={onOpenGapFill} />
        )}

      {/* Modules Explorer */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h3 className="text-sm font-bold text-foreground">Requirement Modules</h3>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            {selectedSrsModules.length} extracted modules
          </span>
        </div>

        {selectedSrsModules.length === 0 ? (
          <div className="border border-dashed rounded-2xl p-16 text-center text-xs text-muted-foreground leading-relaxed flex flex-col items-center justify-center gap-3">
            <Layers className="w-8 h-8 text-muted-foreground/60" />
            <div>
              <p className="font-semibold text-foreground">No modules found</p>
              <p className="mt-1">
                Please analyze your requirement document to generate structured modules.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Module Navigation */}
            <ModuleNavigationList
              modules={selectedSrsModules}
              activeModuleName={activeModuleName}
              onSelectModule={setActiveModuleName}
            />

            {/* Right: Features & Test Cases */}
            <div className="lg:col-span-9 space-y-4">
              <ActiveModulePanel
                activeMod={activeMod}
                selectedSrsFileName={selectedSrs?.originalFileName}
                selectedSrsId={selectedSrs?._id}
                selectedSuite={selectedSuite}
                projectId={projectId}
                onExportExcel={onExportExcel}
                onOpenRunDialog={onOpenRunDialog}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
