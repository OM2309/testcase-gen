'use client'

import React, { useState } from 'react'
import { Link2, Loader2 } from 'lucide-react'

interface LinearConnectionFormProps {
  projectId: string
  onConnect: (payload: { apiKey: string; teamId: string }) => void
  connecting: boolean
}

/**
 * Linear workspace connection form — API key + team ID input.
 */
export function LinearConnectionForm({ projectId, onConnect, connecting }: LinearConnectionFormProps) {
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_LINEAR_API_KEY || '')
  const [teamId, setTeamId] = useState(process.env.NEXT_PUBLIC_LINEAR_TEAM_ID || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConnect({ apiKey: apiKey.trim(), teamId: teamId.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
      <p className="text-[11px] text-muted-foreground">
        Connect this project directly to your Linear workspace to fetch user stories.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-foreground">Linear Personal API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="lin_api_..."
            className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-foreground">Linear Team Key / ID</label>
          <input
            type="text"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
            placeholder="e.g. NIO"
            className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={connecting}
        className="btn-primary w-full flex items-center justify-center gap-1.5 cursor-pointer mt-1"
      >
        {connecting ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting...</>
        ) : (
          <><Link2 className="w-3.5 h-3.5" /> Verify & Connect Linear Workspace</>
        )}
      </button>
    </form>
  )
}
