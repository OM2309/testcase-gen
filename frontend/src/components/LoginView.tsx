'use client'

import React, { useState } from 'react'
import { KeyRound, Mail, User, ShieldAlert, Sparkles, Loader2, Lock, ArrowRight } from 'lucide-react'
import { signIn } from 'next-auth/react'

export function LoginView() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Loading & Error states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic Validation
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (activeTab === 'signup' && !username.trim()) {
      setError('Please choose a username.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    try {
      setLoading(true)
      const res = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password,
        username: username.trim(),
        action: activeTab
      })

      if (res?.error) {
        setError(res.error)
      }
    } catch (err: any) {
      console.error('Auth error:', err)
      setError(err?.message || 'An error occurred during authentication. Please verify backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background relative overflow-hidden px-4">
      {/* Decorative premium radial glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Wrapper */}
      <div className="w-full max-w-[420px] bg-card/40 border border-border/80 rounded-3xl shadow-xl backdrop-blur-md p-8 relative z-10 space-y-6">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-lg shadow-primary/20">
            TG
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Welcome to TestGen AI</h2>
            <p className="text-xs text-muted-foreground mt-1">Playwright automated test suite generator</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-muted/40 border border-border/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin')
              setError(null)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'signin' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup')
              setError(null)
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'signup' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="border border-rose-500/20 bg-rose-500/10 text-rose-400 p-3 rounded-xl flex items-start gap-2.5 text-xs animate-shake">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username Input (Only for Sign Up) */}
          {activeTab === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Username</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="w-full pl-10 pr-3 py-2.5 bg-background/50 border border-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-xs text-foreground placeholder:text-muted-foreground transition-all"
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-3 py-2.5 bg-background/50 border border-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-xs text-foreground placeholder:text-muted-foreground transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-background/50 border border-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 text-xs text-foreground placeholder:text-muted-foreground transition-all"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-95 transition-opacity shadow-lg shadow-primary/10 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {activeTab === 'signin' ? 'Signing In...' : 'Registering...'}
              </>
            ) : (
              <>
                {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer info message */}
        <div className="text-center pt-2 text-[10px] text-muted-foreground flex justify-center items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary animate-pulse" />
          <span>Secure AES encryption enabled</span>
        </div>
      </div>
    </div>
  )
}
