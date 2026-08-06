interface SpectrogramPreviewProps {
  /** seed for deterministic waveform variation */
  variant: 'healthy' | 'restored' | 'degraded'
}

const colors = {
  healthy: { primary: '#2c5a37', secondary: '#5a9169' },
  restored: { primary: '#32729f', secondary: '#4f8fbd' },
  degraded: { primary: '#847d72', secondary: '#b0aaa1' },
}

// Deterministic pseudo-random waveform bars per variant
function generateBars(variant: string): number[] {
  const seed = variant === 'healthy' ? 7 : variant === 'restored' ? 4 : 2
  const bars: number[] = []
  for (let i = 0; i < 48; i++) {
    const base =
      variant === 'healthy'
        ? 0.55 + Math.sin(i * 0.4 + seed) * 0.25 + Math.sin(i * 0.13) * 0.15
        : variant === 'restored'
          ? 0.4 + Math.sin(i * 0.35 + seed) * 0.2 + Math.sin(i * 0.18) * 0.12
          : 0.2 + Math.sin(i * 0.5 + seed) * 0.12 + Math.sin(i * 0.22) * 0.06
    bars.push(Math.max(0.08, Math.min(0.95, base)))
  }
  return bars
}

export default function SpectrogramPreview({ variant }: SpectrogramPreviewProps) {
  const c = colors[variant]
  const bars = generateBars(variant)
  return (
    <div
      className="relative h-14 w-full overflow-hidden rounded-lg bg-charcoal-50 ring-1 ring-charcoal-100"
      role="img"
      aria-label={`Spectrogram preview for ${variant} habitat`}
    >
      <div className="absolute inset-0 flex items-end gap-px px-1.5 py-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{
              height: `${h * 100}%`,
              background: `linear-gradient(to top, ${c.primary}, ${c.secondary})`,
              opacity: 0.45 + h * 0.5,
            }}
          />
        ))}
      </div>
    </div>
  )
}
