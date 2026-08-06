import { MapPin, ArrowRight, ChartBar as BarChart3 } from 'lucide-react'
import MetricCard from '../components/MetricCard'
import TrajectoryChart from '../components/TrajectoryChart'
import EvidenceCard from '../components/EvidenceCard'
import InterpretationPanel from '../components/InterpretationPanel'
import AlertRow from '../components/AlertRow'
import SiteMap from '../components/SiteMap'
import SiteStatusRow from '../components/SiteStatusRow'
import {
  project,
  overviewInterpretation,
  metrics,
  acousticEvidence,
  interpretationText,
  interpretationRows,
  alerts,
  sites,
} from '../data/mockData'
import type { PageId } from '../components/Sidebar'

interface OverviewPageProps {
  onNavigate: (id: PageId) => void
}

export default function OverviewPage({ onNavigate }: OverviewPageProps) {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-forest-500">
          <MapPin className="h-4 w-4" />
          <span>{project.location}</span>
        </div>
        <h1 className="mt-1.5 font-display text-3xl sm:text-4xl font-semibold text-forest-900 tracking-tight">
          Restoration Overview
        </h1>
        <p className="mt-2.5 max-w-2xl text-sm sm:text-base leading-relaxed text-forest-600">
          {overviewInterpretation}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>

      {/* Trajectory chart */}
      <TrajectoryChart />

      {/* Evidence + Interpretation */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="flex items-baseline justify-between flex-wrap gap-3">
            <h2 className="font-display text-xl font-semibold text-forest-900">
              Latest Acoustic Evidence
            </h2>
            <button
              onClick={() => onNavigate('soundscape')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-3.5 py-2 text-sm font-medium text-sand-50 hover:bg-forest-800 transition-colors"
            >
              Compare Soundscapes
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {acousticEvidence.map((e) => (
              <EvidenceCard key={e.label} evidence={e} />
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-ocean-50 ring-1 ring-ocean-200 px-4 py-3 text-xs text-ocean-800">
            <BarChart3 className="h-4 w-4 shrink-0 text-ocean-500" />
            The restored reef’s indicators sit between the degraded and healthy reefs, and trend toward the healthy reference — closer to recovery than to baseline.
          </div>
        </div>

        <InterpretationPanel text={interpretationText} rows={interpretationRows} />
      </div>

      {/* Alerts + Site status */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Alerts */}
        <div className="card p-6 flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-forest-900">Monitoring Alerts</h2>
          <div className="flex flex-col gap-2.5">
            {alerts.map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        </div>

        {/* Site map */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <SiteMap />
          <div className="card p-6 flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold text-forest-900 mb-2">
              Recorder Status
            </h2>
            {sites.map((s) => (
              <SiteStatusRow key={s.id} site={s} />
            ))}
            <p className="mt-3 text-xs text-forest-500">
              Three hydrophones monitor the restored, degraded, and reference sites in parallel.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
