'use client'

import React, { useState, useMemo } from 'react'
import {
  BrainCircuit, Sparkles, FileText, Shield, AlertTriangle, Info,
  Check, ChevronDown, ChevronRight, Loader2, FlaskConical, BookOpen,
  Layers, Cpu
} from 'lucide-react'
import { useProject } from '../contexts/ProjectContext'
import { Badge } from "@/components/ui/badge"

export function RequirementsView() {
  const {
    project,
    selectedSrsId,
    setSelectedSrsId,
    requirementAnalyses,
    agentRunning,
    agentError,
    runAgent1,
    runAgent2
  } = useProject()

  const [activeModuleIdx, setActiveModuleIdx] = useState(0)
  const [showParsedText, setShowParsedText] = useState(false)

  // Find active requirement analysis for the selected SRS document
  const activeRequirement = useMemo(() => {
    if (!selectedSrsId) return requirementAnalyses[0] || null
    return requirementAnalyses.find(r => r.srsDocumentId === selectedSrsId) || null
  }, [requirementAnalyses, selectedSrsId])

  const requirements = activeRequirement?.analyzedData
  const parsedText = useMemo(() => {
    if (!project) return undefined
    if (selectedSrsId) {
      const srsDoc = project.srsDocuments?.find(d => d._id === selectedSrsId)
      return srsDoc?.parsedText
    }
    return project.parsedText
  }, [project, selectedSrsId])

  const error = agentError

  if (agentRunning) {
    const agentNum = agentRunning === 'agent1' ? 1 : 2
    const messages = agentRunning === 'agent1'
      ? ['Reading document structure...', 'Extracting modules and features...', 'Identifying validation rules...', 'Building requirement model...']
      : ['Loading requirement analysis...', 'Designing test scenarios...', 'Generating test steps...', 'Building test suite...']

    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-8 text-center">
        <div className="relative flex items-center justify-center w-36 h-36">
          <div className="absolute inset-0 rounded-full border-4 border-primary/10 animate-ping" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-3 rounded-full border-4 border-primary/20 animate-pulse" />
          <div className="absolute inset-6 rounded-full border-4 border-primary/30 animate-spin" style={{ animationDuration: '3s' }} />
          <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/50 flex items-center justify-center">
            <BrainCircuit className="w-8 h-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
            {agentRunning === 'agent1'
              ? 'Extracting Requirements...'
              : agentRunning === 'agent2'
                ? 'Generating Test Cases...'
                : 'Analyzing Gaps...'}
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-3">
            {agentRunning === 'agent1' ? 'Extracting Requirements...' : 'Generating Test Suite...'}
          </h2>
          <RotatingMessage messages={messages} />
        </div>
        <div className="w-80 space-y-1.5">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '70%', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)', backgroundSize: '200% 100%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card/20 text-xs text-muted-foreground">
        Project not found.
      </div>
    )
  }

  if (!requirements) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Requirements Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">Run Agent 1 to analyze your PRD/SRS and extract structured requirements.</p>
        </div>

        {error && (
          <div className="border border-border bg-muted/40 text-muted-foreground p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
            {error}
          </div>
        )}

        {parsedText && (
          <div className="border border-border bg-card rounded-xl overflow-hidden">
            <button
              onClick={() => setShowParsedText(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="w-4 h-4 text-primary" /> Parsed Document Preview
              </div>
              {showParsedText ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>
            {showParsedText && (
              <div className="border-t border-border px-5 py-4">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">{parsedText}</pre>
              </div>
            )}
          </div>
        )}

        <div className="border border-dashed border-border rounded-2xl bg-card/20 flex flex-col items-center justify-center p-16 text-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BrainCircuit className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="font-semibold text-lg">Run Agent 1</h3>
            <p className="text-sm text-muted-foreground">Analyze your PRD/SRS to extract modules, features, business rules, and validation requirements.</p>
          </div>
          <button
            onClick={() => runAgent1(selectedSrsId || undefined)}
            className="btn-primary h-10 px-5 text-sm"
          >
            <Sparkles className="w-4 h-4" /> Analyze with Agent 1
          </button>
        </div>
      </div>
    )
  }

  const modules = requirements.modules || []
  const globalRoles = requirements.global_roles || []
  const ambiguities = requirements.document_level_ambiguities || []
  const clarifications = requirements.document_level_clarifications_needed || []
  const activeModule = modules[activeModuleIdx]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <span className="text-xs font-bold text-primary tracking-wider uppercase">Agent 1 — Requirement Analysis</span>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{requirements.project_name || 'Project Analysis'}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">{requirements.summary}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => runAgent1(selectedSrsId || undefined)}
            className="btn-secondary"
          >
            <BrainCircuit className="w-3.5 h-3.5" /> Re-analyze
          </button>
          <button
            onClick={() => runAgent2(selectedSrsId || undefined)}
            disabled={agentRunning === 'agent2'}
            className="btn-primary"
          >
            {agentRunning === 'agent2' ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
            ) : (
              <><FlaskConical className="w-3.5 h-3.5" /> Generate Test Suite</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-border bg-muted/40 text-muted-foreground p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          {error}
        </div>
      )}

      {/* SRS Documents Tab Selector */}
      {project.srsDocuments && project.srsDocuments.length > 1 && (
        <div className="flex border-b border-border gap-2">
          {project.srsDocuments.map((doc, idx) => (
            <button
              key={doc._id}
              onClick={() => setSelectedSrsId(doc._id)}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                selectedSrsId === doc._id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              SRS {idx + 1}: {doc.originalFileName}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left — Module Nav */}
        <div className="lg:col-span-1 space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-3">Modules ({modules.length})</h3>
            {modules.map((mod: any, idx: number) => {
              const isActive = activeModuleIdx === idx
              return (
                <button
                  key={idx}
                  onClick={() => setActiveModuleIdx(idx)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                      : 'bg-card/40 border-border hover:bg-card/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Layers className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="truncate">{mod.module_name || `Module ${idx + 1}`}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                </button>
              )
            })}
          </div>

          {globalRoles.length > 0 && (
            <div className="pt-4 border-t border-border/40 space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">System Roles</h3>
              {globalRoles.map((role: any, idx: number) => (
                <div key={idx} className="border border-border/60 bg-card/30 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-foreground capitalize">{role.role}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(role.permissions || []).map((perm: string, pidx: number) => (
                      <span
                        key={pidx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border text-[10px] font-medium text-muted-foreground"
                      >
                        <Check className="w-3 h-3 text-primary flex-shrink-0" />
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Module Details */}
        <div className="lg:col-span-3 space-y-5">
          {activeModule ? (
            <>
              <div className="border border-border bg-card/10 rounded-2xl p-6 space-y-3 relative overflow-hidden flex items-center justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Active Module Details</span>
                    <span className="px-2 py-0.5 rounded-full border bg-muted text-[10px] font-bold text-muted-foreground">
                      {(activeModule.features || []).length} Features
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground capitalize">{activeModule.module_name}</h2>
                  {activeModule.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">{activeModule.description}</p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-4">
                {(activeModule.features || []).map((feat: any, fidx: number) => (
                  <FeatureCard key={fidx} feature={feat} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">Select a module to view details.</div>
          )}

          {(ambiguities.length > 0 || clarifications.length > 0) && (
            <div className="border border-border bg-card rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              {ambiguities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" /> Ambiguities
                  </h4>
                  <ul className="space-y-1 pl-4 list-disc text-xs text-muted-foreground">
                    {ambiguities.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                  </ul>
                </div>
              )}
              {clarifications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-primary" /> Clarifications Needed
                  </h4>
                  <ul className="space-y-1 pl-4 list-disc text-xs text-muted-foreground">
                    {clarifications.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ feature }: { feature: any }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-150 ${expanded ? 'border-primary/30 bg-card/60' : 'border-border/60 bg-card/20 hover:bg-card/30'}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl border flex-shrink-0 ${expanded ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-muted/60 border-border/80 text-muted-foreground'}`}>
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground capitalize">{feature.feature_name}</h4>
            {feature.description && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{feature.description}</p>
            )}
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/40 pt-4">
          {feature.actors?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mr-1">Actors:</span>
              {feature.actors.map((a: string, i: number) => (
                <Badge key={i} variant="secondary" className="px-2.5 py-0.5 text-[9px] font-bold">
                  {a}
                </Badge>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionList label="Functional Requirements" items={feature.functional_requirements} type="functional" />
            <SectionList label="Business Rules" items={feature.business_rules} type="business" />
            <SectionList label="Validation Rules" items={feature.validation_rules} type="validation" />
            <SectionList label="Error Conditions" items={feature.error_conditions} type="error" />
            <SectionList label="State Changes" items={feature.state_changes} type="state" />
            <SectionList label="Expected Outputs" items={feature.expected_outputs} type="output" />
          </div>

          {feature.input_fields?.length > 0 && (
            <div className="space-y-2 border-t border-border/40 pt-4">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block">Input Fields</span>
              <div className="flex flex-wrap gap-2">
                {feature.input_fields.map((field: any, fidx: number) => {
                  const label = typeof field === 'string' ? field : (field.label || field.name || JSON.stringify(field))
                  const isRequired = typeof field === 'object' && field.required
                  return (
                    <span key={fidx} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-muted border border-border font-mono text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                      {label}
                      {isRequired && <span className="text-primary text-[9px] font-bold">*</span>}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SectionList({ label, items, type }: { label: string; items: any[]; type: 'functional' | 'business' | 'validation' | 'error' | 'state' | 'output' }) {
  if (!items || items.length === 0) return null

  const config = {
    functional: {
      border: 'border-primary/20 bg-primary/5 dark:bg-primary/10',
      text: 'text-primary',
      bullet: 'bg-primary'
    },
    business: {
      border: 'border-border bg-card/60',
      text: 'text-muted-foreground',
      bullet: 'bg-muted-foreground/60'
    },
    validation: {
      border: 'border-warning/20 bg-warning/5 dark:bg-warning/10',
      text: 'text-warning',
      bullet: 'bg-warning'
    },
    error: {
      border: 'border-error/20 bg-error/5 dark:bg-error/10',
      text: 'text-error',
      bullet: 'bg-error'
    },
    state: {
      border: 'border-primary/20 bg-primary/5 dark:bg-primary/10',
      text: 'text-primary',
      bullet: 'bg-primary'
    },
    output: {
      border: 'border-success/20 bg-success/5 dark:bg-success/10',
      text: 'text-success',
      bullet: 'bg-success'
    }
  }[type] || { border: 'border-border bg-card', text: 'text-foreground', bullet: 'bg-foreground' }

  const renderItem = (item: any) => {
    if (item === null || item === undefined) return ''
    if (typeof item === 'object') {
      if (item.name !== undefined && (item.from !== undefined || item.to !== undefined)) {
        return `${item.name}: from "${item.from ?? ''}" to "${item.to ?? ''}"`
      }
      return JSON.stringify(item)
    }
    return String(item)
  }

  return (
    <div className={`p-4 rounded-xl border ${config.border} space-y-2.5`}>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${config.text}`}>
        {label}
      </span>
      <ul className="space-y-2 text-xs text-muted-foreground">
        {items.map((item: any, idx: number) => (
          <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
            <span className={`w-1.5 h-1.5 rounded-full ${config.bullet} mt-1.5 flex-shrink-0`} />
            <span>{renderItem(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function RotatingMessage({ messages }: { messages: string[] }) {
  const [idx, setIdx] = useState(0)
  React.useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % messages.length), 2000)
    return () => clearInterval(t)
  }, [messages.length])
  return <p className="text-sm text-muted-foreground transition-all">{messages[idx]}</p>
}
