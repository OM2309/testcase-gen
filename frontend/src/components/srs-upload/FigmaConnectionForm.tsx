'use client'

import React, { useState } from 'react'
import { Link2, Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { projectService } from '../../services/projectService'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FigmaScreensCarouselModal } from '../shared'

interface FigmaConnectionFormProps {
  projectId: string
  initialUrl?: string
  syncedFrames?: Array<{ id: string; name: string; imageUrl: string }>
}

export function FigmaConnectionForm({ projectId, initialUrl = '', syncedFrames = [] }: FigmaConnectionFormProps) {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState(initialUrl)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) {
      toast.error('Figma URL is required.')
      return
    }

    setConnecting(true)
    try {
      const res = await projectService.connectFigma(projectId, {
        figmaFileUrl: url.trim()
      })
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] })
        toast.success('Figma URL saved! Starting sync...')
        // Auto sync after successful connection
        await handleSync()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to save Figma URL.')
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await projectService.syncFigma(projectId)
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] })
        toast.success('Successfully synced Figma design frames! 🎉')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Figma Sync failed. Please verify your file URL.')
    } finally {
      setSyncing(false)
    }
  }

  const isConnected = !!initialUrl

  return (
    <div className="space-y-4 text-xs">
      <form onSubmit={handleConnect} className="space-y-3.5">
        <p className="text-[11px] text-muted-foreground">
          Connect this project to a Figma design file to extract interactive frames, labels, and prototyping transitions.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-foreground">Figma File or Design URL</label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.figma.com/design/your-file-key/..."
              className="px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 text-xs w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="submit"
            disabled={connecting || syncing}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {connecting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving connection...</>
            ) : (
              <><Link2 className="w-3.5 h-3.5" /> Save Figma Connection</>
            )}
          </button>

          {isConnected && (
            <button
              type="button"
              onClick={handleSync}
              disabled={connecting || syncing}
              className="btn-secondary flex items-center justify-center gap-1.5 cursor-pointer px-4"
            >
              {syncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Sync Now
            </button>
          )}
        </div>
      </form>

      {/* Synced Frames List */}
      {isConnected && (
        <div className="border border-border/80 bg-card rounded-2xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Synced Figma Frames ({syncedFrames.length})
            </h4>
            {syncedFrames.length > 0 && (
              <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">
                Ready for Analysis
              </span>
            )}
          </div>

          {syncedFrames.length === 0 ? (
            <div className="text-center py-5 border border-dashed border-border rounded-xl bg-background/50 flex flex-col items-center justify-center gap-1.5">
              <AlertCircle className="w-5.5 h-5.5 text-warning/70" />
              <p className="font-semibold text-[11px] text-foreground">No synced frames yet</p>
              <p className="text-[10px] text-muted-foreground">Click "Sync Now" to download screens from Figma.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[190px] overflow-y-auto pr-1">
              {syncedFrames.map((frame, index) => (
                <div 
                  key={frame.id} 
                  onClick={() => setPreviewIndex(index)}
                  className="bg-background border border-border/60 hover:border-primary/50 rounded-xl p-2 flex flex-col gap-1.5 transition shadow-sm group cursor-pointer"
                >
                  <div className="aspect-video bg-muted border border-border/40 rounded-lg overflow-hidden relative flex items-center justify-center">
                    {frame.imageUrl ? (
                      <img 
                        src={frame.imageUrl} 
                        alt={frame.name} 
                        className="object-contain w-full h-full group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-[9px] text-muted-foreground">No Preview</span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold truncate text-foreground/90 px-0.5" title={frame.name}>
                    {frame.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Carousel Preview Modal */}
      <FigmaScreensCarouselModal
        isOpen={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        frames={syncedFrames}
        initialIndex={previewIndex ?? 0}
      />
    </div>
  )
}
