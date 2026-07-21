'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { User, Mail, Shield, Save, Loader2, Unplug, CheckCircle2, ExternalLink } from 'lucide-react'
import { authService } from '../../../services/authService'
import { slackService, SlackStatus } from '../../../services/slackService'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'developer' | 'qa' | 'project_manager' | 'admin' | 'pending'>('pending')
  const [submitting, setSubmitting] = useState(false)
  const searchParams = useSearchParams()

  // Slack state
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null)
  const [slackLoading, setSlackLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (session?.user) {
      setUsername(session.user.name || '')
      setRole((session as any).user.role || 'pending')
    }
  }, [session])

  // Fetch Slack connection status
  useEffect(() => {
    async function fetchSlackStatus() {
      try {
        const res = await slackService.getStatus()
        if (res.success) {
          setSlackStatus(res.data)
        }
      } catch {
        // Not connected or error, leave as null
      } finally {
        setSlackLoading(false)
      }
    }
    fetchSlackStatus()
  }, [])

  // Handle Slack OAuth redirect params
  useEffect(() => {
    const slackParam = searchParams.get('slack')
    if (slackParam === 'success') {
      toast.success('Slack connected successfully!')
      // Re-fetch status
      slackService.getStatus().then(res => {
        if (res.success) setSlackStatus(res.data)
      })
    } else if (slackParam === 'error') {
      const reason = searchParams.get('reason') || 'Unknown error'
      toast.error(`Slack connection failed: ${reason}`)
    }
  }, [searchParams])

  const handleSlackDisconnect = async () => {
    setDisconnecting(true)
    try {
      await slackService.disconnect()
      setSlackStatus({ connected: false, teamName: null, teamId: null, connectedAt: null })
      toast.success('Slack disconnected.')
    } catch {
      toast.error('Failed to disconnect Slack.')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      toast.error('Username cannot be empty')
      return
    }

    setSubmitting(true)
    try {
      // Normal users can change role from profile, except admin
      const payload: any = { username: username.trim() }
      if (role !== 'admin' && role !== 'pending') {
        payload.role = role
      }

      const res = await authService.updateProfile(payload)
      if (res.success) {
        toast.success('Profile updated successfully!')
        // Update local NextAuth session
        await update({ name: username.trim(), role: role !== 'admin' ? role : undefined })
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Failed to update profile.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatRole = (r: string) => {
    switch (r) {
      case 'admin': return 'Administrator'
      case 'project_manager': return 'Project Manager'
      case 'qa': return 'QA Engineer'
      case 'developer': return 'Developer'
      default: return 'Pending Selection'
    }
  }

  return (
    <div className="max-w-[600px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Profile Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your personal profile details and profession.</p>
      </div>

      <div className="border border-border bg-card rounded-2xl p-6 shadow-sm space-y-6">
        <form onSubmit={handleSave} className="space-y-5">
          {/* Avatar Header */}
          <div className="flex items-center gap-4 border-b border-border/60 pb-5">
            <Avatar size="lg" className="w-14 h-14">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {username ? username.substring(0, 2).toUpperCase() : 'US'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-base text-foreground">{username || 'User Profile'}</h3>
              <p className="text-xs text-muted-foreground">{formatRole(role)}</p>
            </div>
          </div>

          {/* Email (Readonly) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </label>
            <input
              type="email"
              value={session?.user?.email || ''}
              disabled
              className="w-full h-10 border border-border bg-muted/30 px-3 rounded-lg text-xs text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground/60 italic">Your email is managed by your Google login and cannot be modified.</p>
          </div>

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Display Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-10 border border-border bg-card hover:bg-muted/10 px-3 rounded-lg text-xs outline-none focus:border-primary transition-colors"
              placeholder="Username"
              required
            />
          </div>

          {/* Profession Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Profession / Role
            </label>
            {role === 'admin' ? (
              <input
                type="text"
                value="Administrator"
                disabled
                className="w-full h-10 border border-border bg-muted/30 px-3 rounded-lg text-xs text-muted-foreground cursor-not-allowed"
              />
            ) : (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full h-10 border border-border bg-card px-3 rounded-lg text-xs outline-none focus:border-primary cursor-pointer transition-colors"
              >
                <option value="developer">Developer</option>
                <option value="qa">QA Engineer</option>
                <option value="project_manager">Project Manager</option>
              </select>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full h-10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Slack Integration Card */}
      <div className="border border-border bg-card rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4A154B' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zm-2.522 10.124a2.528 2.528 0 0 1 2.522 2.52A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.527 2.527 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.522h-6.313z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Slack Integration</h3>
            <p className="text-xs text-muted-foreground">Connect your Slack workspace to receive notifications</p>
          </div>
        </div>

        {slackLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : slackStatus?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Connected to Slack</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Workspace: <span className="font-medium">{slackStatus.teamName || 'Unknown'}</span>
                  {slackStatus.connectedAt && (
                    <> · Since {new Date(slackStatus.connectedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSlackDisconnect}
              disabled={disconnecting}
              className="w-full h-9 flex items-center justify-center gap-2 border border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {disconnecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Unplug className="w-3.5 h-3.5" /> Disconnect Slack
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              No Slack workspace connected. Connect to enable sending messages and notifications to your Slack channels.
            </p>
            <button
              type="button"
              onClick={async () => {
                setConnecting(true)
                try {
                  const url = await slackService.getConnectUrl()
                  console.log("url", url);
                  window.location.href = url
                } catch {
                  toast.error('Failed to start Slack connection.')
                  setConnecting(false)
                }
              }}
              disabled={connecting}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-lg text-xs font-semibold text-white cursor-pointer transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#4A154B' }}
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" /> Connect Slack Workspace
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
