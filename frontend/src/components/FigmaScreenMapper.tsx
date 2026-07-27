'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from '../types'
import { projectService } from '../services/projectService'
import { Plus, Trash, Save, Link2, AlertCircle, Loader2, Eye, Play } from 'lucide-react'
import { toast } from 'sonner'
import { FigmaDesignMatchPanel } from './execution/FigmaDesignMatchPanel'

interface FigmaScreenMapperProps {
  project: Project
  onUpdate: () => void
}

interface Step {
  action: string
  target: string
  value: string
}

interface Mapping {
  figmaFrameId: string
  targetUrl: string
  steps: Step[]
}

const SUPPORTED_ACTIONS = [
  { value: 'click', label: 'Click Element' },
  { value: 'fill', label: 'Fill Input' },
  { value: 'select', label: 'Select Options' },
  { value: 'check', label: 'Check Box' },
  { value: 'uncheck', label: 'Uncheck Box' },
  { value: 'hover', label: 'Hover Element' },
  { value: 'waitfor', label: 'Wait (ms or element)' },
  { value: 'goto', label: 'Navigate to Path' }
]

export function FigmaScreenMapper({ project, onUpdate }: FigmaScreenMapperProps) {
  const frames = project.figmaSyncedFrames || []
  const [selectedFrameId, setSelectedFrameId] = useState<string>('')
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [isSaving, setIsSaving] = useState(false)
  
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000')
  const [headless, setHeadless] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  
  const [isExecutingSingle, setIsExecutingSingle] = useState(false)
  const [singleRunResult, setSingleRunResult] = useState<any>(null)
  
  const router = useRouter()

  // Initialize mappings from project data
  useEffect(() => {
    if (project.figmaScreenMappings) {
      setMappings(JSON.parse(JSON.stringify(project.figmaScreenMappings)))
    } else {
      setMappings([])
    }
    if (project.figmaBaseUrl) {
      setBaseUrl(project.figmaBaseUrl)
    }

    if (frames.length > 0 && !selectedFrameId) {
      setSelectedFrameId(frames[0].id)
    }
  }, [project, frames, selectedFrameId])

  // Clear single compliance run results when switching frames
  useEffect(() => {
    setSingleRunResult(null)
  }, [selectedFrameId])

  const currentFrame = frames.find(f => f.id === selectedFrameId)
  
  // Find or create mapping for selected frame
  const currentMapping = mappings.find(m => m.figmaFrameId === selectedFrameId) || {
    figmaFrameId: selectedFrameId,
    targetUrl: '',
    steps: []
  }

  const updateCurrentMapping = (updated: Partial<Mapping>) => {
    setMappings(prev => {
      const idx = prev.findIndex(m => m.figmaFrameId === selectedFrameId)
      const updatedMapping = { ...currentMapping, ...updated }
      
      if (idx > -1) {
        const copy = [...prev]
        copy[idx] = updatedMapping
        return copy
      } else {
        return [...prev, updatedMapping]
      }
    })
  }

  const handleUrlInputChange = (val: string) => {
    if (/^https?:\/\//i.test(val.trim())) {
      try {
        const parsed = new URL(val.trim())
        setBaseUrl(parsed.origin)
        updateCurrentMapping({ targetUrl: parsed.pathname })
        toast.info(`Auto-detected domain: ${parsed.origin}`)
      } catch (err) {
        updateCurrentMapping({ targetUrl: '/' + val.replace(/^\/+/, '') })
      }
    } else {
      updateCurrentMapping({ targetUrl: '/' + val.replace(/^\/+/, '') })
    }
  }

  const handleAddStep = () => {
    const updatedSteps = [...currentMapping.steps, { action: 'click', target: '', value: '' }]
    updateCurrentMapping({ steps: updatedSteps })
  }

  const handleRemoveStep = (stepIdx: number) => {
    const updatedSteps = currentMapping.steps.filter((_, idx) => idx !== stepIdx)
    updateCurrentMapping({ steps: updatedSteps })
  }

  const handleStepFieldChange = (stepIdx: number, field: keyof Step, val: string) => {
    const updatedSteps = currentMapping.steps.map((step, idx) => {
      if (idx === stepIdx) {
        return { ...step, [field]: val }
      }
      return step
    })
    updateCurrentMapping({ steps: updatedSteps })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const cleanedMappings = mappings.filter(m => m.targetUrl.trim() !== '' || m.steps.length > 0)
      const res = await projectService.updateFigmaMappings(project._id, {
        mappings: cleanedMappings,
        figmaBaseUrl: baseUrl.trim()
      })
      if (res.success) {
        toast.success('Figma screen navigation mappings saved successfully! 🎨')
        onUpdate()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to save mappings: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRunCompliance = async () => {
    if (!baseUrl.trim() || !/^https?:\/\//i.test(baseUrl.trim())) {
      toast.error('Please specify a valid base URL starting with http:// or https://')
      return
    }
    
    setIsExecuting(true)
    try {
      const cleanedMappings = mappings.filter(m => m.targetUrl.trim() !== '' || m.steps.length > 0)
      await projectService.updateFigmaMappings(project._id, {
        mappings: cleanedMappings,
        figmaBaseUrl: baseUrl.trim()
      })

      const res = await projectService.runFigmaCompliance(project._id, {
        baseUrl: baseUrl.trim(),
        headless
      })

      if (res.success && res.data.runId) {
        toast.success('Figma design compliance run started successfully! 🚀')
        router.push(`/dashboard/${project._id}/execution?runId=${res.data.runId}`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to run compliance check: ${err.message || 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleRunSingleCompliance = async () => {
    if (!baseUrl.trim() || !/^https?:\/\//i.test(baseUrl.trim())) {
      toast.error('Please specify a valid base URL starting with http:// or https://')
      return
    }
    
    setIsExecutingSingle(true)
    setSingleRunResult(null)
    try {
      const cleanedMappings = mappings.filter(m => m.targetUrl.trim() !== '' || m.steps.length > 0)
      await projectService.updateFigmaMappings(project._id, {
        mappings: cleanedMappings,
        figmaBaseUrl: baseUrl.trim()
      })

      const res = await projectService.runFigmaSingleCompliance(project._id, {
        figmaFrameId: selectedFrameId,
        baseUrl: baseUrl.trim(),
        headless
      })

      if (res.success) {
        toast.success('Visual comparison completed! Check results below. 📸')
        setSingleRunResult(res.data)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Visual compliance run failed: ${err.message || 'Unknown error'}`)
    } finally {
      setIsExecutingSingle(false)
    }
  }

  if (frames.length === 0) {
    return (
      <div className="bg-card border border-border border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center space-y-3 min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Link2 className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">No Figma Screens Synced</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Please connect your project to a Figma design file and sync design screens in the Requirements page first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-card border border-border rounded-xl p-6 shadow-sm">
      
      {/* Left Column: Figma Screens List */}
      <div className="lg:col-span-4 border-r border-border/60 pr-6 flex flex-col space-y-4">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-primary" /> Synced Figma Screens
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a design frame to map its live path and navigation steps.
          </p>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
          {frames.map((frame) => {
            const hasMap = mappings.some(m => m.figmaFrameId === frame.id && (m.targetUrl || m.steps.length > 0))
            const isSelected = frame.id === selectedFrameId

            return (
              <button
                key={frame.id}
                onClick={() => setSelectedFrameId(frame.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border/60 hover:bg-muted/40 hover:border-border'
                }`}
              >
                <div className="w-16 aspect-video bg-muted border border-border rounded overflow-hidden flex-shrink-0 relative flex items-center justify-center bg-black/10">
                  {frame.imageUrl ? (
                    <img src={frame.imageUrl} alt={frame.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[8px] text-muted-foreground font-mono">No Image</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{frame.name}</p>
                  <span className={`inline-flex mt-1 items-center px-1.5 py-0.5 rounded text-[9px] font-medium leading-none ${
                    hasMap
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {hasMap ? 'Mapped' : 'Unmapped'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right Column: Mapping configuration Form */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        
        {/* Frame Summary Detail Header */}
        {currentFrame && (
          <div className="flex flex-col sm:flex-row gap-4 items-start bg-muted/20 border border-border/40 rounded-lg p-4">
            <div className="w-24 aspect-video bg-black/20 border border-border rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
              {currentFrame.imageUrl ? (
                <img src={currentFrame.imageUrl} alt={currentFrame.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-[10px] text-muted-foreground">No Preview</span>
              )}
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-mono text-muted-foreground">SELECTED SCREEN</h4>
              <h3 className="text-sm font-bold text-foreground">{currentFrame.name}</h3>
              <p className="text-[10px] text-muted-foreground">ID: {currentFrame.id}</p>
            </div>
          </div>
        )}

        {/* Configurations fields */}
        <div className="space-y-4 flex-1">
          {/* Target URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              Live Page URL Path
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative flex items-center">
                <span className="absolute left-3 text-xs text-muted-foreground select-none font-mono">/</span>
                <input
                  type="text"
                  placeholder="e.g. register or https://example.com/register"
                  value={currentMapping.targetUrl.replace(/^\/+/, '')}
                  onChange={(e) => handleUrlInputChange(e.target.value)}
                  className="w-full pl-6 pr-3 py-2 text-xs bg-card border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Define the page path matching this screen (e.g. `/register` or `/dashboard`). You can also paste a full URL to auto-fill the target domain.
            </p>
          </div>

          {/* Steps list */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div>
                <label className="text-xs font-bold text-foreground">Pre-Navigation Steps</label>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Steps required to navigate the browser to this page view before comparison.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={isExecutingSingle || isSaving}
                  onClick={handleRunSingleCompliance}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 border border-emerald-600/20 hover:border-emerald-600/50 bg-emerald-500/5 px-2 py-1 rounded transition cursor-pointer disabled:opacity-50"
                >
                  {isExecutingSingle ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" /> Play Screen Compliance
                    </>
                  )}
                </button>
                <button
                  onClick={handleAddStep}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary-hover border border-primary/20 hover:border-primary/50 bg-primary/5 px-2 py-1 rounded transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Step
                </button>
              </div>
            </div>

            {currentMapping.steps.length === 0 ? (
              <div className="text-center py-6 bg-muted/10 border border-border/40 rounded-lg border-dashed">
                <p className="text-[10px] text-muted-foreground">
                  No custom navigation steps. Matches immediately on page load.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentMapping.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-card border border-border rounded-lg p-2 shadow-xs group animate-fadeIn">
                    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                      {idx + 1}
                    </span>

                    {/* Action dropdown */}
                    <select
                      value={step.action}
                      onChange={(e) => handleStepFieldChange(idx, 'action', e.target.value)}
                      className="bg-card border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {SUPPORTED_ACTIONS.map((act) => (
                        <option key={act.value} value={act.value}>
                          {act.label}
                        </option>
                      ))}
                    </select>

                    {/* Target Selector */}
                    <input
                      type="text"
                      placeholder="Target (e.g. link:Sign Up)"
                      value={step.target}
                      onChange={(e) => handleStepFieldChange(idx, 'target', e.target.value)}
                      className="flex-1 min-w-0 bg-card border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />

                    {/* Value Field */}
                    <input
                      type="text"
                      placeholder="Value (Optional)"
                      value={step.value}
                      onChange={(e) => handleStepFieldChange(idx, 'value', e.target.value)}
                      className="flex-1 min-w-0 bg-card border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />

                    {/* Delete Step */}
                    <button
                      onClick={() => handleRemoveStep(idx)}
                      className="p-1 text-muted-foreground hover:text-error hover:bg-error/5 rounded transition cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Render Single Visual Compliance Match Results */}
          {singleRunResult && (
            <div className="mt-4 pt-4 border-t border-border/60 animate-scaleIn">
              <h4 className="text-xs font-bold text-foreground mb-3">Live Visual Compliance Audit</h4>
              <FigmaDesignMatchPanel
                testCase={{
                  testCaseId: 'single-run',
                  title: 'Single Screen Compliance Check',
                  module: 'Figma Mapping',
                  feature: currentFrame?.name || 'Design Match',
                  status: singleRunResult.status === 'match' ? 'passed' : 'failed',
                  durationMs: 0,
                  screenshotPath: singleRunResult.actualScreenshotUrl,
                  figmaFrameId: selectedFrameId,
                  designMatchResult: {
                    status: singleRunResult.status,
                    similarityScore: singleRunResult.similarityScore,
                    visualDiffPath: singleRunResult.visualDiffUrl,
                    discrepancies: singleRunResult.discrepancies
                  },
                  stepResults: []
                }}
                frames={frames}
              />
            </div>
          )}
        </div>

        {/* Configuration for runner */}
        <div className="border-t border-border/60 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/10 p-3 rounded-lg border border-border/40">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Compliance Target Base URL</label>
            <input
              type="text"
              placeholder="e.g. http://localhost:3000"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-card border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 pt-4">
            <input
              type="checkbox"
              id="headlessMode"
              checked={headless}
              onChange={(e) => setHeadless(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="headlessMode" className="text-xs font-semibold text-foreground select-none cursor-pointer">
              Run Headless Browser (Recommended)
            </label>
          </div>
        </div>

        {/* Save Bar */}
        <div className="border-t border-border/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5" /> Mappings apply during compliance runs.
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-md shadow transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 fill-current" /> Save Mappings
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
