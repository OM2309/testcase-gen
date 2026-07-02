'use client'

import React, { useState } from 'react'
import { agentService } from '../services/agentService'
import { FileText, CheckSquare, Loader, AlertTriangle, Shield, Check, Info } from 'lucide-react'

interface RequirementsViewProps {
  projectId: string
  requirements: any
  onTestCasesGenerated: (suiteId: string, testCases: any[]) => void
}

export function RequirementsView({ projectId, requirements, onTestCasesGenerated }: RequirementsViewProps) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0)

  if (!requirements) {
    return (
      <div className="text-center py-12 border border-border border-dashed rounded-xl bg-card/25 p-8">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="font-semibold text-lg">No Requirements Loaded</h3>
        <p className="text-sm text-muted-foreground mt-1">Please select an existing project or run an analyzer session first.</p>
      </div>
    )
  }

  const handleGenerateTestCases = async () => {
    try {
      setError(null)
      setGenerating(true)
      const res = await agentService.generateTestCases(projectId, requirements)
      if (res.success) {
        onTestCasesGenerated(res.testSuiteId, res.testCases)
      } else {
        setError('Failed to generate test cases.')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to design automated test suite.')
    } finally {
      setGenerating(false)
    }
  }

  const modules = requirements.modules || []
  const globalRoles = requirements.global_roles || []
  const ambiguities = requirements.document_level_ambiguities || []
  const clarifications = requirements.document_level_clarifications_needed || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <span className="text-xs font-semibold text-primary tracking-wider uppercase">Agent 1: Requirement Analysis</span>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{requirements.project_name || 'Untitled Project'}</h1>
          <p className="text-sm text-muted-foreground mt-1">{requirements.summary || 'No summary available.'}</p>
        </div>
        <button
          onClick={handleGenerateTestCases}
          disabled={generating}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold disabled:opacity-60 h-fit"
        >
          {generating ? (
            <>
              <Loader className="w-4 h-4 animate-spin" /> Generating Tests...
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4" /> Generate Test Suite
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-4 rounded-lg flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Module Navigation Tabs */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-3 mb-2">Modules ({modules.length})</h3>
          {modules.map((mod: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setActiveModuleIndex(idx)}
              className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeModuleIndex === idx ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{mod.module_name || `Module ${idx + 1}`}</span>
            </button>
          ))}
        </div>

        {/* Right columns: Active Module Details */}
        <div className="lg:col-span-3 space-y-6">
          {modules[activeModuleIndex] ? (
            <div className="space-y-6">
              <div className="border border-border bg-card/10 rounded-xl p-5 space-y-2">
                <h2 className="text-lg font-semibold">{modules[activeModuleIndex].module_name}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{modules[activeModuleIndex].description || 'No module description provided.'}</p>
              </div>

              {/* List of features */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Module Features</h3>
                {(modules[activeModuleIndex].features || []).map((feat: any, fidx: number) => (
                  <div key={fidx} className="border border-border bg-card rounded-xl overflow-hidden">
                    <div className="bg-muted/40 px-5 py-4 border-b border-border">
                      <h4 className="font-semibold text-base text-foreground">{feat.feature_name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{feat.description || 'No description.'}</p>
                    </div>

                    <div className="p-5 space-y-4 text-sm">
                      {feat.actors && feat.actors.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-xs font-semibold text-muted-foreground mr-1">Actors:</span>
                          {feat.actors.map((actor: string, aidx: number) => (
                            <span key={aidx} className="px-2 py-0.5 text-xs rounded bg-muted text-foreground border border-border">{actor}</span>
                          ))}
                        </div>
                      )}

                      {feat.functional_requirements && feat.functional_requirements.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Functional Requirements</span>
                          <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
                            {feat.functional_requirements.map((req: string, ridx: number) => (
                              <li key={ridx} className="leading-relaxed">{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {feat.business_rules && feat.business_rules.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Business Rules</span>
                          <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
                            {feat.business_rules.map((rule: string, bidx: number) => (
                              <li key={bidx} className="leading-relaxed">{rule}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {feat.validation_rules && feat.validation_rules.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Validation Rules</span>
                          <ul className="space-y-1 pl-4 list-disc text-muted-foreground">
                            {feat.validation_rules.map((rule: string, vidx: number) => (
                              <li key={vidx} className="leading-relaxed">{rule}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {feat.input_fields && feat.input_fields.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Input Fields & Elements</span>
                          <div className="flex flex-wrap gap-1.5">
                            {feat.input_fields.map((field: string, fidx2: number) => (
                              <span key={fidx2} className="px-2.5 py-1 text-xs rounded bg-muted/65 text-foreground border border-border/80 font-mono">{field}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">Select a module to view its details.</div>
          )}

          {/* Global Configuration details */}
          <div className="border border-border bg-card rounded-xl p-5 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Global Specifications</h3>

            {globalRoles.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground"><Shield className="w-4 h-4 text-primary" /> System Roles & Permissions</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {globalRoles.map((roleObj: any, idx: number) => (
                    <div key={idx} className="border border-border/60 bg-muted/20 rounded-lg p-3.5 space-y-2">
                      <span className="font-semibold text-sm text-foreground">{roleObj.role}</span>
                      <div className="flex flex-wrap gap-1">
                        {(roleObj.permissions || []).map((perm: string, pidx: number) => (
                          <span key={pidx} className="px-1.5 py-0.5 text-[10px] bg-card rounded text-muted-foreground border border-border inline-flex items-center gap-0.5"><Check className="w-2.5 h-2.5 text-primary" /> {perm}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(ambiguities.length > 0 || clarifications.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-5">
                {ambiguities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-rose-400 inline-flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Detected Ambiguities</h4>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-muted-foreground">
                      {ambiguities.map((item: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {clarifications.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-amber-400 inline-flex items-center gap-1.5"><Info className="w-4 h-4" /> Clarifications Needed</h4>
                    <ul className="space-y-1 pl-4 list-disc text-xs text-muted-foreground">
                      {clarifications.map((item: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
