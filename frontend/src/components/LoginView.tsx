'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, Quote } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Avatar, AvatarFallback } from './ui/avatar'

export function LoginView() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const errParam = searchParams?.get('error')
    if (errParam) {
      setError(decodeURIComponent(errParam))
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await signIn('google', { callbackUrl: '/' })
    } catch (err: any) {
      console.error('Google Sign-In Error:', err)
      setError('An error occurred during authentication. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground overflow-hidden">

      {/* LEFT PANEL: Clean Modern Login Interface */}
      <div className="w-full md:w-[50%] flex flex-col justify-between p-8 md:p-16 relative">
        {/* Soft decorative glow */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

        {/* Top Header Logo */}
        <div className="flex justify-center w-full z-10">
          <img
            src="/Memorres-logo-light theme.png"
            alt="Memorres Logo"
            className="h-16 md:h-20 w-auto object-contain"
          />
        </div>

        {/* Main Content Area */}
        <div className="max-w-[420px] w-full mx-auto my-auto py-12 z-10 space-y-8">
          <div className="space-y-2.5">
            <h2 className="text-3xl font-extrabold tracking-tight text-center md:text-left">Welcome Back!</h2>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Sign in with your Google account to access the dashboard.
            </p>
          </div>

          {error && (
            <div className="border border-destructive/20 bg-destructive/10 text-destructive text-xs p-3.5 rounded-xl leading-relaxed flex items-start gap-2.5">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-3 bg-card border border-border hover:bg-muted/80 text-foreground font-semibold px-4 rounded-xl shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.09 14.974 0 12 0 7.354 0 3.307 2.673 1.347 6.57l3.919 3.195z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.275c0-.825-.074-1.62-.21-2.385H12v4.51h6.46c-.278 1.47-1.11 2.71-2.36 3.55l3.68 2.85c2.15-1.98 3.39-4.89 3.39-8.525z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.266 14.235L1.347 17.43A11.962 11.962 0 0 0 12 24c2.97 0 5.64-.98 7.52-2.65l-3.68-2.85c-1.03.69-2.35 1.1-3.84 1.1-2.91 0-5.38-1.96-6.26-4.6l-3.92 3.195z"
                  />
                  <path
                    fill="#34A853"
                    d="M5.266 9.765c-.22.66-.345 1.37-.345 2.11 0 .74.125 1.45.345 2.11l3.92-3.195-3.92-2.11z"
                  />
                </svg>
              )}
              <span className="text-sm font-semibold">Continue with Google</span>
            </button>
          </div>
        </div>

        {/* Empty placeholder bottom footer */}
        <div className="h-4 z-10" />
      </div>

      {/* RIGHT PANEL: Highly Premium Indigo/Blue Gradient & Testimonial Section */}
      <div className="hidden md:flex md:w-[50%] bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 p-16 flex-col justify-center relative overflow-hidden">
        {/* Abstract light effects matching indigo/blue theme */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        {/* Brand visual grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="max-w-[500px] space-y-10 z-10">
          {/* Main Visual Title */}
          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
            Revolutionize QA with <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-300">
              Smarter Automation
            </span>
          </h1>

          {/* Testimonial card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl relative space-y-5">
            <Quote className="absolute top-4 right-4 w-12 h-12 text-white/5 pointer-events-none" />
            <p className="text-white/80 leading-relaxed text-sm italic">
              "TestGen AI has completely transformed our testing process. It's reliable, efficient, and ensures our releases are always top-notch."
            </p>
            <div className="flex items-center gap-3.5 pt-1">
              <Avatar className="w-9 h-9 border border-white/20 shadow-lg">
                <AvatarFallback className="bg-gradient-to-tr from-indigo-400 to-sky-400 text-indigo-950 font-bold text-xs">
                  AS
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-bold text-white text-sm">Anurag Sharma</h4>
                <p className="text-[11px] text-white/60">Software Engineer at DevCore</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
