'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Code, ShieldCheck, ClipboardList, Loader2, Sparkles } from 'lucide-react'
import { authService } from '../../services/authService'
import { toast } from 'sonner'

export default function ChooseRolePage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<'developer' | 'qa' | 'project_manager' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    } else if (status === 'authenticated') {
      const role = (session as any)?.user?.role
      if (role && role !== 'pending') {
        router.replace('/dashboard/projects')
      }
    }
  }, [status, session, router])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-semibold">Loading profile workspace...</p>
      </div>
    )
  }

  const handleSelectRole = (role: 'developer' | 'qa' | 'project_manager') => {
    setSelectedRole(role)
  }

  const handleSubmit = async () => {
    if (!selectedRole) return
    setSubmitting(true)
    try {
      const res = await authService.updateRole(selectedRole)
      if (res.success) {
        toast.success('Profession saved successfully!')
        // Force NextAuth to reload its token and session details
        await update({ role: selectedRole })
        router.replace('/dashboard/projects')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.response?.data?.error || 'Failed to update profession.')
    } finally {
      setSubmitting(false)
    }
  }

  const rolesList = [
    {
      id: 'developer' as const,
      title: 'Developer',
      description: '',
      icon: Code,
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20'
    },
    {
      id: 'qa' as const,
      title: 'QA Engineer',
      description: '',
      icon: ShieldCheck,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      id: 'project_manager' as const,
      title: 'Project Manager',
      description: '',
      icon: ClipboardList,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20'
    }
  ]

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Premium glow effects */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="max-w-[700px] w-full space-y-8 text-center relative z-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Profile Activation</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">Choose Your Profession</h1>
          <p className="text-sm text-muted-foreground max-w-[480px] mx-auto">
            Select your primary role to customize your workspace experience and permissions in TestGen AI.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mt-6">
          {rolesList.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id
            return (
              <div
                key={role.id}
                onClick={() => handleSelectRole(role.id)}
                className={`border rounded-2xl p-5 bg-card cursor-pointer transition-all duration-300 relative flex flex-col justify-between hover:shadow-md ${isSelected
                  ? 'border-primary ring-2 ring-primary/20 scale-[1.02]'
                  : 'border-border hover:border-muted-foreground/45 hover:scale-[1.01]'
                  }`}
              >
                <div className="space-y-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${role.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-base">{role.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {role.description}
                    </p>
                  </div>
                </div>

                {/* Selected indicator checkmark */}
                {isSelected && (
                  <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white">
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Action Button */}
        <div className="pt-4 flex flex-col items-center gap-4">
          <button
            onClick={handleSubmit}
            disabled={!selectedRole || submitting}
            className="btn-primary w-full max-w-[280px] h-11 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
            ) : (
              <span>Activate Account</span>
            )}
          </button>
          <span className="text-[10px] text-muted-foreground">
            You can modify your selection anytime from your Profile settings.
          </span>
        </div>
      </div>
    </div>
  )
}
