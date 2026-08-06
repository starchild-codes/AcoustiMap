import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, ZoomIn, ZoomOut } from 'lucide-react'
import type { SegmentSelection } from '../soundscape/types'

interface WaveformProps {
  peaks: number[]
  duration: number
  audioElement: HTMLAudioElement | null
  onSeek?: (time: number) => void
  onSegmentChange?: (segment: SegmentSelection | null) => void
  segment?: SegmentSelection | null
  height?: number
  accentColor?: string
}

export default function Waveform({
  peaks,
  duration,
  audioElement,
  onSeek,
  onSegmentChange,
  segment,
  height = 80,
  accentColor = '#3c7349',
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)

  useEffect(() => {
    if (!audioElement) return
    const updateTime = () => setCurrentTime(audioElement.currentTime)
    audioElement.addEventListener('timeupdate', updateTime)
    return () => audioElement.removeEventListener('timeupdate', updateTime)
  }, [audioElement])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, rect.width, height)

    const visiblePeaks = Math.floor(peaks.length * zoom)
    const barWidth = rect.width / visiblePeaks
    const midHeight = height / 2

    for (let i = 0; i < visiblePeaks; i++) {
      const peakIdx = Math.floor((i / visiblePeaks) * peaks.length)
      const peak = peaks[peakIdx] || 0
      const barHeight = peak * midHeight * 0.9
      const x = i * barWidth
      const progress = duration > 0 ? currentTime / duration : 0
      const isPlayed = i / visiblePeaks < progress
      ctx.fillStyle = isPlayed ? accentColor : '#d3cfc9'
      ctx.fillRect(x, midHeight - barHeight, Math.max(barWidth - 1, 0.5), barHeight * 2)
    }

    if (segment && duration > 0) {
      const startX = (segment.startTime / duration) * rect.width
      const endX = (segment.endTime / duration) * rect.width
      ctx.fillStyle = 'rgba(56, 115, 73, 0.15)'
      ctx.fillRect(startX, 0, endX - startX, height)
      ctx.strokeStyle = accentColor
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(startX, 0)
      ctx.lineTo(startX, height)
      ctx.moveTo(endX, 0)
      ctx.lineTo(endX, height)
      ctx.stroke()
    }

    const progressX = duration > 0 ? (currentTime / duration) * rect.width : 0
    ctx.strokeStyle = accentColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(progressX, 0)
    ctx.lineTo(progressX, height)
    ctx.stroke()
  }, [peaks, zoom, height, currentTime, duration, segment, accentColor])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const handleResize = () => draw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration === 0) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * duration
    if (onSeek) onSeek(time)
    if (audioElement) audioElement.currentTime = time
    setCurrentTime(time)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration === 0) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    setIsDragging(true)
    setDragStart(x)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || duration === 0) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const startTime = (Math.min(dragStart, x) / rect.width) * duration
    const endTime = (Math.max(dragStart, x) / rect.width) * duration
    if (onSegmentChange && endTime - startTime > 0.1) {
      onSegmentChange({ startTime, endTime })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg bg-sand-50 cursor-pointer"
          style={{ height }}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          role="img"
          aria-label={`Waveform visualization, current time ${formatTime(currentTime)} of ${formatTime(duration)}`}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-charcoal-500 tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span className="text-charcoal-300">/</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(1, z / 1.5))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-500 hover:bg-sand-100 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(10, z * 1.5))}
            className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-500 hover:bg-sand-100 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          {onSegmentChange && segment && (
            <button
              onClick={() => onSegmentChange(null)}
              className="ml-1 rounded-md px-2 py-1 text-xs text-charcoal-500 hover:bg-sand-100 transition-colors"
            >
              Reset selection
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export { Play, Pause }
