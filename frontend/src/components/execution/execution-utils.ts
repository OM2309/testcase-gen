/**
 * Formatting helpers shared across execution UI components.
 */

/** Formats a millisecond duration into a compact human string (e.g. "1.2s", "450ms", "1m 5s"). */
export function formatDuration(ms?: number | null): string {
  if (!ms || ms <= 0) return '—'
  if (ms < 1000) return `${ms}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const mins = Math.floor(seconds / 60)
  const rem = Math.round(seconds % 60)
  return `${mins}m ${rem}s`
}

/** Formats an ISO timestamp into a local time string. Returns "—" when absent. */
export function formatTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** Elapsed duration between two ISO timestamps (or start → now if not finished). */
export function elapsedBetween(start?: string | null, end?: string | null): string {
  if (!start) return '—'
  const startMs = new Date(start).getTime()
  const endMs = end ? new Date(end).getTime() : Date.now()
  return formatDuration(endMs - startMs)
}
