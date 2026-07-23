'use client'

import React, { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Frame {
  id: string
  name: string
  imageUrl: string
}

interface FigmaScreensCarouselModalProps {
  isOpen: boolean
  onClose: () => void
  frames: Frame[]
  initialIndex: number
  onChangeIndex?: (index: number) => void
}

export function FigmaScreensCarouselModal({
  isOpen,
  onClose,
  frames,
  initialIndex,
  onChangeIndex
}: FigmaScreensCarouselModalProps) {
  const [activeIndex, setActiveIndex] = React.useState(initialIndex)

  useEffect(() => {
    setActiveIndex(initialIndex)
  }, [initialIndex])

  // Sync index changes back to parent if callback exists
  useEffect(() => {
    if (onChangeIndex) {
      onChangeIndex(activeIndex)
    }
  }, [activeIndex, onChangeIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, activeIndex, frames.length])

  if (!isOpen || frames.length === 0) return null

  const handlePrev = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : frames.length - 1))
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev < frames.length - 1 ? prev + 1 : 0))
  }

  const currentFrame = frames[activeIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      {/* Click outside to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="relative w-full max-w-5xl bg-card border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] z-10 animate-scaleIn">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/20">
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm text-foreground truncate max-w-md" title={currentFrame.name}>
              {currentFrame.name}
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono">
              Screen {activeIndex + 1} of {frames.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Carousel slide area */}
        <div className="relative flex-1 bg-black/40 flex items-center justify-center p-6 min-h-[350px]">
          {/* Previous Button */}
          <button
            onClick={handlePrev}
            className="absolute left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white hover:scale-105 transition cursor-pointer shadow-lg border border-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Screen Image */}
          <div className="relative max-w-full max-h-[50vh] flex items-center justify-center select-none">
            {currentFrame.imageUrl ? (
              <img
                src={currentFrame.imageUrl}
                alt={currentFrame.name}
                className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-md"
                draggable={false}
              />
            ) : (
              <div className="w-[450px] h-[300px] bg-muted border border-border border-dashed rounded-xl flex items-center justify-center text-xs text-muted-foreground font-semibold">
                No Preview Available
              </div>
            )}
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            className="absolute right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white hover:scale-105 transition cursor-pointer shadow-lg border border-white/10"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom thumbnail bar */}
        <div className="border-t border-border/60 bg-muted/10 p-4">
          <div className="flex gap-2 overflow-x-auto pb-1 max-w-full scrollbar-thin scrollbar-thumb-border">
            {frames.map((frame, idx) => (
              <button
                key={frame.id}
                onClick={() => setActiveIndex(idx)}
                className={`flex-shrink-0 w-20 aspect-video rounded-lg overflow-hidden border-2 transition relative flex items-center justify-center bg-black/20 cursor-pointer ${
                  idx === activeIndex
                    ? 'border-primary shadow-md ring-1 ring-primary/40'
                    : 'border-border/60 opacity-60 hover:opacity-100 hover:border-border'
                }`}
              >
                {frame.imageUrl ? (
                  <img
                    src={frame.imageUrl}
                    alt={frame.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[8px] text-muted-foreground font-semibold">No Image</span>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/60 py-0.5 text-[8px] font-bold text-center text-white/90 truncate px-1">
                  {frame.name}
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
