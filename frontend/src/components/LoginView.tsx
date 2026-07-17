'use client'

import React, { useState, useEffect } from 'react'
import { ShieldAlert, Sparkles, Loader2 } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'

export function LoginView() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Loading & Error states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark) {
      setTheme('dark')
    } else {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      if (mediaQuery.matches) {
        setTheme('dark')
      }
    }
  }, [])

  useEffect(() => {
    const errParam = searchParams?.get('error')
    if (errParam) {
      setError(decodeURIComponent(errParam))
    }
  }, [searchParams])

  useEffect(() => {
    const token = searchParams?.get('token')
    if (token) {
      setLoading(true)
      setError(null)
      signIn('credentials', {
        redirect: false,
        token: token,
        action: 'google'
      }).then((res) => {
        if (res?.error) {
          setError(res.error)
          setLoading(false)
        } else {
          router.replace('/dashboard/projects')
        }
      }).catch((err) => {
        console.error('Google callback auth error:', err)
        setError('An error occurred during authentication.')
        setLoading(false)
      })
    }
  }, [searchParams, router])

  const handleGoogleLogin = () => {
    setLoading(true)
    setError(null)
    // Redirect to the backend Google auth route
    window.location.href = 'http://localhost:5000/api/auth/google'
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background relative overflow-hidden px-4">
      {/* Decorative premium radial glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Wrapper */}
      <div className="w-full max-w-[420px] bg-card/40 border border-border/80 rounded-3xl shadow-xl backdrop-blur-md p-8 relative z-10 space-y-6">

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center justify-center w-full mb-2">
            <img
              src={theme === 'light' ? "/Memorres-logo dark theme.png" : "/Memorres-logo-light theme.png"}
              alt="Memorres Logo"
              className="h-auto max-h-12 object-contain"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">Welcome to TestGen AI</h2>
            <p className="text-xs text-muted-foreground mt-1">Playwright automated test suite generator</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="text-center text-xs text-muted-foreground/90 px-2 leading-relaxed">
          {loading && searchParams?.get('token') ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Completing secure login...</span>
            </div>
          ) : (
            <p>Sign in using your Google account to access your workspace and manage test suites.</p>
          )}
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="border border-border bg-muted/40 text-muted-foreground p-3 rounded-xl flex items-start gap-2.5 text-xs animate-shake">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Google Login Button */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 bg-card border border-border hover:bg-muted/60 text-foreground font-semibold px-4 py-2 rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && !searchParams?.get('token') ? (
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
            <span className="text-sm font-semibold">Sign in with Google</span>
          </button>
        </div>

        {/* Footer info message */}
        <div className="text-center pt-2 text-[10px] text-muted-foreground flex justify-center items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary animate-pulse" />
          <span>Secure Google OAuth 2.0 authentication</span>
        </div>
      </div>
    </div>
  )
}
