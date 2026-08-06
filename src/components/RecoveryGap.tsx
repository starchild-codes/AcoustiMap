import { recoveryGap } from '../data/mockData'

export default function RecoveryGap() {
  const { currentDistanceFromHealthy, improvementFromDegradedBaseline, previousPeriodGap, explanation } =
    recoveryGap
  // Visual scale: 0 = degraded baseline, 100 = healthy reference
  // Restored position = 100 - currentDistanceFromHealthy = 81
  const restoredPos = 100 - currentDistanceFromHealthy
  const previousPos = 100 - previousPeriodGap

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div>
        <h2 className="section-title">Recovery Gap</h2>
        <p className="mt-1 text-xs leading-relaxed text-charcoal-500">{explanation}</p>
      </div>

      {/* Horizontal comparison scale */}
      <div className="flex flex-col gap-2">
        <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-sand-300 via-ocean-200 to-forest-300">
          {/* Previous period marker */}
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-charcoal-300 shadow-sm"
            style={{ left: `${previousPos}%` }}
            aria-label={`Previous period at ${previousPos}%`}
          />
          {/* Current marker */}
          <div
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ocean-600 shadow-sm"
            style={{ left: `${restoredPos}%` }}
            aria-label={`Current at ${restoredPos}%`}
          />
        </div>
        <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide text-charcoal-400">
          <span>Degraded baseline</span>
          <span>Healthy reference</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-2.5">
        <div className="flex items-center justify-between rounded-lg bg-sand-50 px-3 py-2">
          <span className="text-xs text-charcoal-500">Current distance from healthy reference</span>
          <span className="text-sm font-semibold text-charcoal-900 tabular-nums">
            {currentDistanceFromHealthy} pts
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-sand-50 px-3 py-2">
          <span className="text-xs text-charcoal-500">Improvement from degraded baseline</span>
          <span className="text-sm font-semibold text-forest-700 tabular-nums">
            +{improvementFromDegradedBaseline}%
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-sand-50 px-3 py-2">
          <span className="text-xs text-charcoal-500">Previous monitoring period gap</span>
          <span className="text-sm font-semibold text-charcoal-900 tabular-nums">
            {previousPeriodGap} pts
          </span>
        </div>
      </div>
    </div>
  )
}
