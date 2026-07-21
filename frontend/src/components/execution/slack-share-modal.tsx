'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { slackService, SlackRecipient } from '../../services/slackService'
import { TestRun } from '../../types'
import { toast } from 'sonner'
import { Search, Loader2, Send, MessageSquare, Hash, User as UserIcon, Check } from 'lucide-react'

interface SlackShareModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  run: TestRun
}

export function SlackShareModal({ open, onOpenChange, run }: SlackShareModalProps) {
  const [channels, setChannels] = useState<SlackRecipient[]>([])
  const [users, setUsers] = useState<SlackRecipient[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const initialMessage = useMemo(() => {
    if (!run) return ''
    const statusEmoji = run.status === 'completed' ? '✅' : run.status === 'failed' ? '❌' : '⏳'
    const startedAtStr = run.startedAt
      ? new Date(run.startedAt).toLocaleString()
      : new Date(run.createdAt).toLocaleString()
    const successRate = run.totalTests > 0 ? `${((run.passedTests / run.totalTests) * 100).toFixed(0)}%` : '0%'

    return `📊 *Test Execution Report*
*Project:* ${run.projectName || 'Default Project'} | *Suite:* ${run.suiteName || 'Automated Suite'}
*Status:* ${statusEmoji} ${run.status.toUpperCase()}
*Results:* ${run.totalTests} Total | ${run.passedTests} Passed | ${run.failedTests} Failed | ${run.skippedTests} Skipped
*Success Rate:* ${successRate}
*Date:* ${startedAtStr}
*Target URL:* ${typeof window !== 'undefined' ? window.location.href : '—'}`
  }, [run])

  const [messageText, setMessageText] = useState('')

  useEffect(() => {
    if (open) {
      setMessageText(initialMessage)
      setSelectedIds([])
      setSearchQuery('')
      loadSlackDetails()
    }
  }, [open, initialMessage])

  const loadSlackDetails = async () => {
    setLoading(true)
    try {
      const data = await slackService.getChannels()
      setChannels(data.channels || [])
      setUsers(data.users || [])
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load Slack channels and users.')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels
    const query = searchQuery.toLowerCase()
    return channels.filter(c => c.name.toLowerCase().includes(query))
  }, [channels, searchQuery])

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    const query = searchQuery.toLowerCase()
    return users.filter(u =>
      u.name.toLowerCase().includes(query) ||
      (u.displayName && u.displayName.toLowerCase().includes(query))
    )
  }, [users, searchQuery])

  const handleSend = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one channel or user to share with.')
      return
    }

    setSending(true)
    try {
      await slackService.sendMessage(selectedIds, messageText)
      toast.success(`Report shared successfully to ${selectedIds.length} recipient(s)! 🚀`)
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Failed to send report on Slack.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Share Report on Slack
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose workspace channels or users to share this test execution report with.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground font-medium animate-pulse">
              Retrieving workspace channels and users...
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-5 mt-2 overflow-hidden flex-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search channels or users..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-muted/40 border border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Main Selection Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-hidden flex-1 min-h-0">
              {/* Left Column: Channels and Users list */}
              <div className="border border-border/60 rounded-xl bg-muted/10 overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-muted/20 border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Recipients
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                  {/* Channels Section */}
                  {filteredChannels.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-bold text-muted-foreground/80 px-2.5 py-0.5">CHANNELS</h4>
                      {filteredChannels.map(ch => {
                        const isSelected = selectedIds.includes(ch.id)
                        return (
                          <div
                            key={ch.id}
                            onClick={() => toggleSelect(ch.id)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${isSelected
                                ? 'bg-primary/10 border-primary/20 text-primary font-medium'
                                : 'hover:bg-muted/50 text-foreground'
                              }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Hash className="w-4 h-4 flex-shrink-0 text-muted-foreground/75" />
                              <span className="text-xs truncate">{ch.name}</span>
                            </div>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-border/80'
                              }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Users Section */}
                  {filteredUsers.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-bold text-muted-foreground/80 px-2.5 py-0.5">USERS</h4>
                      {filteredUsers.map(u => {
                        const isSelected = selectedIds.includes(u.id)
                        return (
                          <div
                            key={u.id}
                            onClick={() => toggleSelect(u.id)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${isSelected
                                ? 'bg-primary/10 border-primary/20 text-primary font-medium'
                                : 'hover:bg-muted/50 text-foreground'
                              }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  className="w-4.5 h-4.5 rounded-full object-cover border border-border/40"
                                />
                              ) : (
                                <UserIcon className="w-4.5 h-4.5 p-0.5 rounded-full bg-muted border border-border/80 text-muted-foreground" />
                              )}
                              <span className="text-xs truncate">{u.displayName || u.name}</span>
                            </div>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-border/80'
                              }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {filteredChannels.length === 0 && filteredUsers.length === 0 && (
                    <div className="text-center py-10 text-xs text-muted-foreground">
                      No matching channels or users found.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Message Preview and edit */}
              <div className="flex flex-col border border-border/60 rounded-xl bg-muted/10 overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/20 border-b border-border/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Message Preview
                </div>
                <div className="flex-1 p-3 flex flex-col gap-2">
                  <textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    className="flex-1 w-full bg-transparent border-0 resize-none text-[11px] font-mono leading-relaxed outline-none p-1 text-foreground"
                    placeholder="Enter custom message details..."
                  />
                  <div className="text-[9px] text-muted-foreground border-t border-border/40 pt-2 px-1">
                    *Supports basic Slack mrkdwn formatting.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between border-t border-border/40 pt-4">
              <span className="text-xs text-muted-foreground">
                {selectedIds.length} recipient(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="btn-secondary py-1.5 px-4 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || selectedIds.length === 0}
                  className="btn-primary py-1.5 px-4.5 text-xs font-semibold flex items-center gap-1.5"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
