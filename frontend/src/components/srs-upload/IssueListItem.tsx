'use client'

import React from 'react'
import { JiraIssue, LinearIssue } from '../../types'
import { ExternalLink } from 'lucide-react'

interface IssueListItemProps {
  issue: JiraIssue | LinearIssue
  isSelected: boolean
  onToggle: (key: string) => void
  externalUrl: string
}

/**
 * Shared issue row component used by both Jira and Linear issue explorers.
 * Renders a clickable row with checkbox, issue key/title, description, and external link.
 */
export function IssueListItem({ issue, isSelected, onToggle, externalUrl }: IssueListItemProps) {
  const state = 'state' in issue ? issue.state : undefined

  return (
    <div
      onClick={() => onToggle(issue.key)}
      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer hover:bg-muted/40 transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {}} // Controlled by outer container click
        className="mt-0.5 pointer-events-none"
      />
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-primary flex items-center gap-0.5">
            {issue.key}
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-block hover:opacity-80"
            >
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </span>
          <span className="font-semibold text-foreground">{issue.title}</span>
          {state && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {state}
            </span>
          )}
        </div>
        {issue.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
            {issue.description}
          </p>
        )}
      </div>
    </div>
  )
}
