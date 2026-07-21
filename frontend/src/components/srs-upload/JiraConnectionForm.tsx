'use client'

import React, { useState } from 'react'
import { Link2, Loader2 } from 'lucide-react'

interface JiraConnectionFormProps {
  projectId: string
  onConnect: (payload: { host: string; email: string; token: string; projectKey: string }) => void
  connecting: boolean
}

/**
 * Jira Cloud connection form — credentials input + connect button.
 */
export function JiraConnectionForm({ projectId, onConnect, connecting }: JiraConnectionFormProps) {
  const [host, setHost] = useState(process.env.NEXT_PUBLIC_JIRA_HOST || '')
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_JIRA_EMAIL || '')
  const [token, setToken] = useState(process.env.NEXT_PUBLIC_JIRA_TOKEN || '')
  const [projectKey, setProjectKey] = useState(process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConnect({
      host: host.trim(),
      email: email.trim(),
      token: token.trim(),
      projectKey: projectKey.trim()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
      <p className="text-[11px] text-muted-foreground">
        Connect this project directly to your Jira Cloud workspace to fetch user stories.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-foreground">Jira Host URL</label>
          <input
            type="text"
            value={host}
            onChange={e => setHost(e.target.value)}
            placeholder="https://your-domain.atlassian.net"
            className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-foreground">Jira Project Key</label>
          <input
            type="text"
            value={projectKey}
            onChange={e => setProjectKey(e.target.value)}
            placeholder="e.g. KAN"
            className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-foreground">Atlassian Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@email.com"
            className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-foreground">Jira API Token</label>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Atlassian Personal Token"
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
          <><Link2 className="w-3.5 h-3.5" /> Verify & Connect Jira Workspace</>
        )}
      </button>
    </form>
  )
}
