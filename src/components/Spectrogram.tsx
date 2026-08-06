import { useRef, useEffect, useState, useCallback } from 'react'
import { Settings2 } from 'lucide-react'
import type { SegmentSelection } from '../soundscape/types'
import { computeSpectrogramData } from '../soundscape/audioUtils'

interface SpectrogramProps {
  audioBuffer: AudioBuffer | null
  duration: number
  fftSize?: number
  freqMax?: number
  contrast?: number
  segment?: SegmentSelection | null
  currentTime?: number
  height?: number
}

export default function Spectrogram({
  audioBuffer,
  duration,
  fftSize = 2048,
  freqMax = 22050,
  contrast = 1.0,
  segment,
  currentTime = 0,
  height = 160,
}: SpectrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [localFftSize, setLocalFftSize] = useState(fftSize)
  const [localFreqMax, setLocalFreqMax] = useState(freqMax)
  const [localContrast, setLocalContrast] = useState(contrast)

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

    ctx.fillStyle = '#1a1815'
    ctx.fillRect(0, 0, rect.width, height)

    if (!audioBuffer) {
      ctx.fillStyle = '#847d72'
      ctx.font = '13px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('No audio loaded — upload a recording to generate a spectrogram', rect.width / 2, height / 2)
      return
    }

    const { data, numBins, numCols, binWidth } = computeSpectrogramData(
      audioBuffer,
      localFftSize,
      localFreqMax,
      localContrast,
    )

    const colWidth = rect.width / numCols
    const rowHeight = height / numBins

    for (let col = 0; col < numCols; col++) {
      for (let row = 0; row < numBins; row++) {
        const value = data[col][numBins - 1 - row]
        const intensity = Math.min(1, value)
        const hue = 240 - intensity * 240
        const lightness = intensity * 60
        ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`
        ctx.fillRect(col * colWidth, row * rowHeight, Math.ceil(colWidth) + 1, Math.ceil(rowHeight) + 1)
      }
    }

    if (segment && duration > 0) {
      const startX = (segment.startTime / duration) * rect.width
      const endX = (segment.endTime / duration) * rect.width
      ctx.strokeStyle = '#3c7349'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(startX, 0)
      ctx.lineTo(startX, height)
      ctx.moveTo(endX, 0)
      ctx.lineTo(endX, height)
      ctx.stroke()
      ctx.setLineDash([])
    }

    if (currentTime > 0 && duration > 0) {
      const x = (currentTime / duration) * rect.width
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    void binWidth
  }, [audioBuffer, duration, localFftSize, localFreqMax, localContrast, segment, currentTime, height])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const handler = () => draw()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [draw])

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg"
        style={{ height, backgroundColor: '#1a1815' }}
        role="img"
        aria-label={`Spectrogram showing frequency energy over time. Frequency range 0 to ${localFreqMax} Hz. ${
          segment ? `Selected segment from ${segment.startTime.toFixed(1)}s to ${segment.endTime.toFixed(1)}s.` : ''
        }`}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-charcoal-400">
          <span>0 Hz</span>
          <span>—</span>
          <span>{(localFreqMax / 1000).toFixed(1)} kHz</span>
        </div>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-charcoal-500 hover:bg-sand-100 transition-colors"
          aria-expanded={showAdvanced}
          aria-label="Toggle advanced spectrogram controls"
        >
          <Settings2 className="h-3 w-3" />
          Advanced
        </button>
      </div>
      {showAdvanced && (
        <div className="card p-3 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase text-charcoal-400">FFT size</label>
            <select
              value={localFftSize}
              onChange={(e) => setLocalFftSize(Number(e.target.value))}
              className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-xs"
            >
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase text-charcoal-400">Freq max (Hz)</label>
            <input
              type="number"
              value={localFreqMax}
              onChange={(e) => setLocalFreqMax(Number(e.target.value))}
              className="w-24 rounded-md border border-charcoal-200 bg-white px-2 py-1 text-xs"
              min={500}
              max={22050}
              step={500}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium uppercase text-charcoal-400">Contrast</label>
            <input
              type="range"
              value={localContrast}
              onChange={(e) => setLocalContrast(Number(e.target.value))}
              className="w-24"
              min={0.5}
              max={3}
              step={0.1}
            />
          </div>
        </div>
      )}
    </div>
  )
}
