'use client'

import React, { useState, useEffect } from 'react'
import { MessageSquare, Loader2, CheckCircle2, RefreshCw, Unplug, Info, Edit3, ListFilter } from 'lucide-react'
import { slackService, SlackRecipient } from '../../services/slackService'
import { projectService } from '../../services/projectService'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface SlackConnectionFormProps {
  projectId: string
  slackChannelId?: string
  slackChannelName?: string
  slackConnected?: boolean
  onUpdated?: (updatedProject: any) => void
}

export function SlackConnectionForm({
  projectId,
  slackChannelId = '',
  slackChannelName = '',
  slackConnected = false,
  onUpdated
}: SlackConnectionFormProps) {
  const queryClient = useQueryClient()
  const [channels, setChannels] = useState<SlackRecipient[]>([])
  const [selectedChannelId, setSelectedChannelId] = useState(slackChannelId)
  const [customChannelInput, setCustomChannelInput] = useState('')
  const [useManualInput, setUseManualInput] = useState(false)
  const [loadingChannels, setLoadingChannels] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchChannels = async () => {
    setLoadingChannels(true)
    setLoadError(null)
    try {
      const data = await slackService.getChannels()
      setChannels(data.channels || [])
    } catch (err: any) {
      console.error(err)
      setLoadError(err.response?.data?.message || 'Failed to fetch Slack channels.')
    } finally {
      setLoadingChannels(false)
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [])

  useEffect(() => {
    setSelectedChannelId(slackChannelId)
    if (slackChannelId && !channels.some(c => c.id === slackChannelId)) {
      setCustomChannelInput(slackChannelId)
    }
  }, [slackChannelId, channels])

  // Helper to extract channel ID if a full Slack URL is pasted
  const parseChannelId = (input: string): { id: string; name: string } => {
    const trimmed = input.trim()
    // Check if Slack URL: https://xxx.slack.com/archives/C0812345678 or similar
    const urlMatch = trimmed.match(/\/archives\/([A-Z0-9]+)/i)
    if (urlMatch && urlMatch[1]) {
      return { id: urlMatch[1], name: `#${urlMatch[1]}` }
    }
    if (trimmed.startsWith('#')) {
      return { id: trimmed, name: trimmed }
    }
    return { id: trimmed, name: trimmed.startsWith('C') || trimmed.startsWith('G') ? `#${trimmed}` : trimmed }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let targetId = selectedChannelId
    let targetName = slackChannelName

    if (useManualInput) {
      if (!customChannelInput.trim()) {
        toast.error('Please enter a Channel ID or paste a Slack channel link.')
        return
      }
      const parsed = parseChannelId(customChannelInput)
      targetId = parsed.id
      targetName = parsed.name
    } else {
      if (!targetId) {
        toast.error('Please select a Slack channel.')
        return
      }
      const selectedCh = channels.find(c => c.id === targetId)
      targetName = selectedCh ? `#${selectedCh.name}` : slackChannelName || targetId
    }

    setSaving(true)
    try {
      const res = await projectService.updateProject(projectId, {
        slackChannelId: targetId,
        slackChannelName: targetName,
        slackConnected: true
      })

      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success(`Connected project to Slack channel ${targetName}! 🎉`)
      if (onUpdated && res.data) {
        onUpdated(res.data)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to save Slack channel setting.')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async () => {
    setSaving(true)
    try {
      const res = await projectService.updateProject(projectId, {
        slackChannelId: '',
        slackChannelName: '',
        slackConnected: false
      })

      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Slack channel disconnected from project.')
      setSelectedChannelId('')
      setCustomChannelInput('')
      if (onUpdated && res.data) {
        onUpdated(res.data)
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to disconnect Slack channel.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 text-xs">
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground">
          Invite the Slack bot to your channel (<code className="text-primary font-mono font-semibold">/invite @Test Gen AI</code>) then choose the channel below.
        </p>
      </div>

      {slackConnected && slackChannelId ? (
        <div className="p-3.5 border border-emerald-500/20 bg-emerald-500/10 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Project Connected to Slack
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Channel: <span className="font-bold text-foreground">{slackChannelName || slackChannelId}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={saving}
              className="btn-secondary text-xs px-2.5 py-1 text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
            >
              <Unplug className="w-3.5 h-3.5" /> Disconnect
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSave} className="space-y-3.5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-foreground">Project Notification Channel</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setUseManualInput(!useManualInput)}
                className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                {useManualInput ? (
                  <><ListFilter className="w-3 h-3" /> Select from List</>
                ) : (
                  <><Edit3 className="w-3 h-3" /> Enter ID / Link Manually</>
                )}
              </button>
              {!useManualInput && (
                <button
                  type="button"
                  onClick={fetchChannels}
                  disabled={loadingChannels}
                  className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingChannels ? 'animate-spin' : ''}`} /> Reload
                </button>
              )}
            </div>
          </div>

          {useManualInput ? (
            <div className="space-y-2">
              <input
                type="text"
                value={customChannelInput}
                onChange={e => setCustomChannelInput(e.target.value)}
                placeholder="e.g. C0812345678 or paste Slack channel link"
                className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs w-full"
              />
              <p className="text-[10px] text-muted-foreground">
                Tip: In Slack, right-click your channel &gt; <strong>Copy link</strong>, then paste it here.
              </p>
            </div>
          ) : loadingChannels ? (
            <div className="flex items-center gap-2 p-2.5 border border-border bg-background rounded-xl text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Loading workspace channels...
            </div>
          ) : loadError ? (
            <div className="p-2.5 border border-rose-500/20 bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400 text-[11px]">
              {loadError}
            </div>
          ) : (
            <select
              value={selectedChannelId}
              onChange={e => setSelectedChannelId(e.target.value)}
              className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs w-full cursor-pointer"
            >
              <option value="">-- Choose a Slack Channel --</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  #{ch.name} {ch.isPrivate ? '(Private Channel)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Private Channel Tip Box */}
        <div className="p-3 border border-border bg-muted/30 rounded-xl flex items-start gap-2 text-[11px] text-muted-foreground">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Can't find your private channel in the dropdown?</p>
            <p>
              1. Make sure you invited the bot to the channel (type <code className="text-foreground font-semibold">/invite @Test Gen AI</code> in the channel).<br/>
              2. Click <strong>"Enter ID / Link Manually"</strong> above, right-click your channel in Slack, select <strong>Copy link</strong>, and paste it here!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="submit"
            disabled={saving || (!useManualInput && !selectedChannelId) || (useManualInput && !customChannelInput.trim()) || loadingChannels}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Channel...</>
            ) : (
              <><MessageSquare className="w-3.5 h-3.5" /> Save Project Channel</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

