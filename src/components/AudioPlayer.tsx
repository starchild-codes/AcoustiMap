import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import type { SegmentSelection } from '../soundscape/types'

interface AudioPlayerProps {
  src: string | null | undefined
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  segment?: SegmentSelection | null
  loopSegment?: boolean
  syncGroup?: string
  isSyncPlaying?: boolean
  onSyncPlay?: () => void
  onSyncPause?: () => void
  onSyncSeek?: () => void
  audioRef?: React.RefObject<HTMLAudioElement>
  disabled?: boolean
  disabledNote?: string
}

export default function AudioPlayer({
  src,
  onTimeUpdate,
  onDurationChange,
  segment,
  loopSegment,
  syncGroup,
  isSyncPlaying,
  onSyncPlay,
  onSyncPause,
  onSyncSeek,
  audioRef: externalRef,
  disabled,
  disabledNote,
}: AudioPlayerProps) {
  const internalRef = useRef<HTMLAudioElement>(null)
  const audioRef = externalRef ?? internalRef
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      onTimeUpdate?.(audio.currentTime)

      if (loopSegment && segment && audio.currentTime >= segment.endTime) {
        audio.currentTime = segment.startTime
      }
    }
    const handleDurationChange = () => {
      setDuration(audio.duration)
      onDurationChange?.(audio.duration)
    }
    const handlePlay = () => {
      setIsPlaying(true)
      onSyncPlay?.()
    }
    const handlePause = () => {
      setIsPlaying(false)
      onSyncPause?.()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [audioRef, onTimeUpdate, onDurationChange, segment, loopSegment, onSyncPlay, onSyncPause])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isSyncPlaying === true && audio.paused) {
      audio.play().catch(() => {})
    } else if (isSyncPlaying === false && !audio.paused) {
      audio.pause()
    }
  }, [isSyncPlaying, audioRef])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !onSyncSeek || duration === 0) return
    onSyncSeek()
  }, [onSyncSeek, audioRef, duration])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !src) return
    if (audio.paused) {
      if (segment) audio.currentTime = segment.startTime
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [audioRef, src, segment])

  const restart = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = segment?.startTime ?? 0
  }

  const formatTime = (t: number) => {
    if (!isFinite(t)) return '0:00'
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (disabled) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-charcoal-200 bg-sand-50 px-4 py-6 text-center">
        <p className="text-xs font-medium text-charcoal-500">Audio controls disabled</p>
        {disabledNote && <p className="text-[11px] text-charcoal-400">{disabledNote}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-charcoal-100 bg-white px-3 py-2">
      <audio ref={audioRef} src={src ?? undefined} preload="metadata" />
      <button
        onClick={togglePlay}
        disabled={!src}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-sand-50 hover:bg-forest-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>
      <button
        onClick={restart}
        disabled={!src}
        className="flex h-7 w-7 items-center justify-center rounded-md text-charcoal-500 hover:bg-sand-100 transition-colors disabled:opacity-40"
        aria-label="Restart"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-2 text-xs text-charcoal-500 tabular-nums">
        <span>{formatTime(currentTime)}</span>
        <span className="text-charcoal-300">/</span>
        <span>{formatTime(duration)}</span>
      </div>
      {segment && (
        <span className="ml-auto text-[10px] font-medium text-forest-700">
          Segment: {formatTime(segment.startTime)}–{formatTime(segment.endTime)}
        </span>
      )}
      {syncGroup && (
        <span className="ml-auto text-[10px] font-medium text-ocean-600">Sync group: {syncGroup}</span>
      )}
    </div>
  )
}
