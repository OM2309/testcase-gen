'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { User, Mail, Shield, Save, Loader2 } from 'lucide-react'
import { authService } from '../../../services/authService'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'developer' | 'qa' | 'project_manager' | 'admin' | 'pending'>('pending')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (session?.user) {
      setUsername(session.user.name || '')
      setRole((session as any).user.role || 'pending')
    }
  }, [session])

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
    </div>
  )
}
