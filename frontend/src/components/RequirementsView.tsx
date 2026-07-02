'use client'

import React, { useState } from 'react'
import { agentService } from '../services/agentService'
import {
  BrainCircuit, Sparkles, FileText, Shield, AlertTriangle, Info,
  Check, ChevronDown, ChevronRight, Loader2, FlaskConical, BookOpen
} from 'lucide-react'

interface RequirementsViewProps {
  projectId: string
  requirements: any
  parsedText?: string
  onRequirementsGenerated: (data: any) => void
  onTestCasesGenerated: (suiteData: any) => void
}

export function RequirementsView({
  projectId,
  requirements,
  parsedText,
  onRequirementsGenerated,
  onTestCasesGenerated
}: RequirementsViewProps) {
  const [runningAgent1, setRunningAgent1] = useState(false)
  const [runningAgent2, setRunningAgent2] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeModuleIdx, setActiveModuleIdx] = useState(0)
  const [showParsedText, setShowParsedText] = useState(false)

  const handleRunAgent1 = async () => {
    try {
      setError(null)
      setRunningAgent1(true)
      const res = await agentService.generateRequirements(projectId)
      if (res.success) {
        onRequirementsGenerated(res.data.analyzedData)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Agent 1 analysis failed. Please try again.')
    } finally {
      setRunningAgent1(false)
    }
  }

  const handleRunAgent2 = async () => {
    try {
      setError(null)
      setRunningAgent2(true)
      const res = await agentService.generateTestSuite(projectId)
      if (res.success) {
        onTestCasesGenerated(res.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Agent 2 generation failed. Please try again.')
    } finally {
      setRunningAgent2(false)
    }
  }

  // Animated agent loading state
  if (runningAgent1 || runningAgent2) {
    const agentNum = runningAgent1 ? 1 : 2
    const messages = runningAgent1
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
            Agent {agentNum} Running
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-3">
            {agentNum === 1 ? 'Analyzing Requirements...' : 'Generating Test Suite...'}
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

  // Empty state - no requirements yet
  if (!requirements) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Requirements Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">Run Agent 1 to analyze your PRD/SRS and extract structured requirements.</p>
        </div>

        {error && (
          <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
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
            onClick={handleRunAgent1}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" /> Analyze with Agent 1
          </button>
        </div>
      </div>
    )
  }

  // Requirements loaded
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
            onClick={handleRunAgent1}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted transition-colors"
          >
            <BrainCircuit className="w-3.5 h-3.5" /> Re-analyze
          </button>
          <button
            onClick={handleRunAgent2}
            disabled={runningAgent2}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {runningAgent2 ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            ) : (
              <><FlaskConical className="w-4 h-4" /> Generate Test Suite</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left — Module Nav */}
        <div className="lg:col-span-1 space-y-1.5">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-3">Modules ({modules.length})</h3>
          {modules.map((mod: any, idx: number) => (
            <button
              key={idx}
              onClick={() => setActiveModuleIdx(idx)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeModuleIdx === idx ? 'bg-primary/10 text-primary border-l-[3px] border-primary pl-[10px]' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{mod.module_name || `Module ${idx + 1}`}</span>
            </button>
          ))}

          {globalRoles.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/40">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-3">Roles</h3>
              {globalRoles.map((role: any, idx: number) => (
                <div key={idx} className="px-3 py-2 rounded-lg bg-card border border-border/50 space-y-1.5 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold">{role.role}</span>
                  </div>
                  {(role.permissions || []).map((perm: string, pidx: number) => (
                    <div key={pidx} className="flex items-center gap-1 text-[10px] text-muted-foreground pl-5">
                      <Check className="w-2.5 h-2.5 text-emerald-500" />
                      {perm}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — Module Details */}
        <div className="lg:col-span-3 space-y-5">
          {activeModule ? (
            <>
              <div className="border border-border bg-card/30 rounded-xl p-5 space-y-1">
                <h2 className="text-base font-bold">{activeModule.module_name}</h2>
                <p className="text-sm text-muted-foreground">{activeModule.description}</p>
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
            <div className="border border-border bg-card rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              {ambiguities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Ambiguities
                  </h4>
                  <ul className="space-y-1 pl-4 list-disc text-xs text-muted-foreground">
                    {ambiguities.map((item: string, idx: number) => <li key={idx}>{item}</li>)}
                  </ul>
                </div>
              )}
              {clarifications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> Clarifications Needed
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
    <div className="border border-border bg-card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
      >
        <div className="text-left">
          <h4 className="font-semibold text-sm">{feature.feature_name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border/40">
          {feature.actors?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mr-1 self-center">Actors:</span>
              {feature.actors.map((a: string, i: number) => (
                <span key={i} className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">{a}</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <SectionList label="Functional Requirements" items={feature.functional_requirements} color="blue" />
            <SectionList label="Business Rules" items={feature.business_rules} color="purple" />
            <SectionList label="Validation Rules" items={feature.validation_rules} color="orange" />
            <SectionList label="Error Conditions" items={feature.error_conditions} color="red" />
            <SectionList label="State Changes" items={feature.state_changes} color="emerald" />
            <SectionList label="Expected Outputs" items={feature.expected_outputs} color="teal" />
          </div>

          {feature.input_fields?.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground block">Input Fields</span>
              <div className="flex flex-wrap gap-2">
                {feature.input_fields.map((field: any, fidx: number) => {
                  const label = typeof field === 'string' ? field : (field.label || field.name || JSON.stringify(field))
                  const isRequired = typeof field === 'object' && field.required
                  return (
                    <span key={fidx} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-muted/50 border border-border font-mono text-foreground">
                      {label}
                      {isRequired && <span className="text-rose-400 text-[9px] font-bold">*</span>}
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

function SectionList({ label, items, color }: { label: string; items: string[]; color: string }) {
  if (!items || items.length === 0) return null
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    red: 'text-rose-400',
    emerald: 'text-emerald-400',
    teal: 'text-teal-400',
  }
  return (
    <div className="space-y-1.5">
      <span className={`text-[10px] font-bold uppercase tracking-wide ${colorMap[color] || 'text-muted-foreground'}`}>{label}</span>
      <ul className="space-y-1 pl-3 list-disc text-xs text-muted-foreground">
        {items.map((item: string, idx: number) => <li key={idx} className="leading-relaxed">{item}</li>)}
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
