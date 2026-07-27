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
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <div
        className="min-h-screen w-full flex bg-white text-black overflow-hidden"
        style={{ fontFamily: "'Poppins', var(--font-poppins), sans-serif" }}
      >

        {/* LEFT PANEL: Clean Modern Login Interface with Warm Yellow Accents */}
        <div className="w-full md:w-[50%] flex flex-col justify-between p-8 md:p-16 relative bg-[#FFFDF2]">
          {/* Soft decorative yellow ambient glow */}
          <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-[#FFFCEB] border border-[#FFF7C2] blur-2xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-[200px] h-[200px] rounded-full bg-[#FBDD24]/10 blur-3xl pointer-events-none" />

          {/* Top Header Logo */}
          <div className="flex justify-center md:justify-start w-full z-10">
            <img
              src="/Memorres-logo-light theme.png"
              alt="Memorres Logo"
              className="h-14 md:h-20 w-auto object-contain"
            />
          </div>

          {/* Main Content Area */}
          <div className="max-w-[420px] w-full mx-auto my-auto py-12 z-10 space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF7C2] border border-[#FBDD24]/40 text-black text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#FBDD24]" /> TestGen AI Workspace
              </div>
              <h2 className="text-4xl font-black tracking-tight text-black text-center md:text-left">Welcome Back</h2>
              <p className="text-sm text-gray-700 text-center md:text-left font-medium">
                Sign in with your Google account to access your testing workspace.
              </p>
            </div>

            {error && (
              <div className="border border-red-200 bg-red-50 text-red-700 text-xs p-3.5 rounded-xl leading-relaxed flex items-start gap-2.5 shadow-sm">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-13 flex items-center justify-center gap-3 bg-white border-2 border-black hover:bg-[#FFFCEB] text-black font-bold px-5 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
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
                <span className="text-sm font-bold">Continue with Google</span>
              </button>
            </div>
          </div>

          {/* Footer info */}
          {/* <div className="z-10 text-[11px] text-gray-500 font-medium text-center md:text-left">
          Protected by Memorres Authentication System
        </div> */}
        </div>

        {/* RIGHT PANEL: High Contrast Vibrant Yellow & Dark Black Hero Section */}
        <div className="hidden md:flex md:w-[50%] bg-[#FBDD24] p-16 flex-col justify-between relative overflow-hidden border-l-2 border-black">
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          {/* Decorative backdrop shapes */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/40 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-[#FFF7C2]/60 rounded-full blur-2xl pointer-events-none" />

          <div className="z-10 flex items-center justify-between">
            <span className="font-extrabold text-black tracking-widest text-xs uppercase bg-black text-white px-3 py-1 rounded-md">
              AI QA Platform
            </span>
          </div>

          <div className="max-w-[480px] space-y-8 z-10 my-auto">
            {/* Main Visual Title */}
            <h1 className="text-5xl font-black tracking-tight text-black leading-[1.1]">
              Revolutionize QA <br />
              <span className="px-2.5 py-0.5 rounded-lg inline-block mt-1">
                With Smarter Automation
              </span>
            </h1>

            {/* Testimonial card */}
            <div className="bg-white border-2 border-black rounded-2xl p-7 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative space-y-4">
              <Quote className="absolute top-4 right-4 w-10 h-10 text-[#FBDD24] pointer-events-none" />
              <p className="text-black font-medium leading-relaxed text-sm">
                "TestGen AI has completely transformed our testing process. It's reliable, efficient, and ensures our releases are always top-notch."
              </p>
              <div className="flex items-center gap-3.5 pt-2 border-t border-gray-100">
                <Avatar className="w-10 h-10 border-2 border-black shadow-sm">
                  <AvatarFallback className="bg-[#FBDD24] text-black font-extrabold text-xs">
                    AS
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-black text-black text-sm">Anurag Sharma</h4>
                  <p className="text-xs text-gray-600 font-medium">Software Engineer</p>
                </div>
              </div>
            </div>
          </div>

          <div className="z-10 flex items-center justify-between text-xs text-black font-bold">
            <span>© {new Date().getFullYear()} Memorres</span>
            <span>All rights reserved</span>
          </div>
        </div>

      </div>
    </>
  )
}
