import React, { useState } from 'react'
import { X, Play, Eye, AlertCircle } from 'lucide-react'
import { apiClient } from '../../services/apiClient'

interface InspectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (type: string, name: string) => void
}

export function InspectorModal({ isOpen, onClose, onSelect }: InspectorModalProps) {
  const [url, setUrl] = useState('http://localhost:3000')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleStart = async () => {
    if (!url.trim()) {
      setError('Please enter a valid URL')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.post('/inspector/start', { url: url.trim() })
      if (response.data.success && response.data.data) {
        const { type, name } = response.data.data
        onSelect(type, name)
        onClose()
      } else {
        setError(response.data.message || 'Failed to capture element')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/30">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Visual Element Selector</h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter the website URL to inspect. A browser window will open automatically. Simply hover over any element to highlight it, and click to capture its locator selector.
          </p>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Target Web URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g., http://localhost:3000"
              disabled={loading}
              className="w-full px-3 py-2 text-xs bg-muted/50 border border-border rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-60"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-semibold text-primary animate-pulse">
                Interactive Browser Active... Click an element!
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/40 bg-muted/10">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/95 rounded-lg shadow-sm shadow-primary/25 transition-all active:scale-[0.98] disabled:opacity-60"
          >
            <Play className="w-3 h-3" />
            {loading ? 'Running...' : 'Launch Inspector'}
          </button>
        </div>

      </div>
    </div>
  )
}
