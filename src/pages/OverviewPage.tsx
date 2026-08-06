import { MapPin, ArrowRight, Clock, CalendarDays } from 'lucide-react'
import MetricCard from '../components/MetricCard'
import TrajectoryChart from '../components/TrajectoryChart'
import EvidenceCard from '../components/EvidenceCard'
import InterpretationPanel from '../components/InterpretationPanel'
import AlertRow from '../components/AlertRow'
import SiteMap from '../components/SiteMap'
import SiteStatusRow, { RecorderSummary } from '../components/SiteStatusRow'
import RecoveryGap from '../components/RecoveryGap'
import {
  project,
  overviewInterpretation,
  metrics,
  acousticEvidence,
  interpretationText,
  interpretationRows,
  interpretationLimitations,
  alerts,
  sites,
} from '../data/mockData'
import type { PageId } from '../components/Sidebar'

interface OverviewPageProps {
  onNavigate: (id: PageId) => void
}

export default function OverviewPage({ onNavigate }: OverviewPageProps) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* Header — compact, scannable */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-charcoal-400">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{project.location}</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal-900 tracking-tight">
              Restoration Overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-600">
              {overviewInterpretation}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="pill ring-1 bg-forest-50 text-forest-700 ring-forest-200">
              <span className="h-1.5 w-1.5 rounded-full bg-forest-500" />
              Positive acoustic recovery
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Last updated: {project.lastUpdated}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Monitoring period: {project.monitoringDateRange}
          </span>
        </div>
      </header>

      {/* Metric cards */}
      <section aria-label="Primary metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {metrics.map((m) => (
            <MetricCard key={m.id} metric={m} />
          ))}
        </div>
      </section>

      {/* Trajectory chart + Recovery gap */}
      <section aria-label="Recovery trajectory" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TrajectoryChart />
        </div>
        <div className="lg:col-span-1">
          <RecoveryGap />
        </div>
      </section>

      {/* Acoustic evidence + Interpretation */}
      <section aria-label="Acoustic evidence" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-4">
          <div className="flex items-baseline justify-between flex-wrap gap-3">
            <h2 className="section-title text-xl">Latest Acoustic Evidence</h2>
            <button
              onClick={() => onNavigate('soundscape')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest-700 px-3.5 py-2 text-sm font-medium text-sand-50 hover:bg-forest-800 transition-colors focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2"
            >
              Open Soundscape Comparison
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {acousticEvidence.map((e) => (
              <EvidenceCard key={e.label} evidence={e} />
            ))}
          </div>
          {/* Connector scale showing restored reef between degraded and healthy */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-charcoal-400">
                Recovery position
              </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-charcoal-300 via-ocean-300 to-forest-500">
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-charcoal-400 shadow-sm"
                style={{ left: '49%' }}
                aria-label="Degraded reef at 49% similarity"
              />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ocean-600 shadow-sm ring-2 ring-ocean-200"
                style={{ left: '81%' }}
                aria-label="Restored reef at 81% similarity"
              />
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-forest-600 shadow-sm"
                style={{ left: '100%' }}
                aria-label="Healthy reference at 100% similarity"
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-medium uppercase tracking-wide text-charcoal-400">
              <span>Degraded 49%</span>
              <span className="text-ocean-700">Restored 81%</span>
              <span>Healthy 100%</span>
            </div>
          </div>
        </div>

        <InterpretationPanel
          text={interpretationText}
          rows={interpretationRows}
          limitations={interpretationLimitations}
        />
      </section>

      {/* Alerts + Site monitoring */}
      <section aria-label="Monitoring alerts and site status" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Alerts — activity feed */}
        <div className="card p-5 flex flex-col gap-3">
          <h2 className="section-title">Monitoring Alerts</h2>
          <div className="flex flex-col gap-2">
            {alerts.map((a) => (
              <AlertRow key={a.id} alert={a} />
            ))}
          </div>
        </div>

        {/* Site map + recorder status */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <SiteMap />
          <div className="card p-5 flex flex-col">
            <h2 className="section-title mb-2">Recorder Status</h2>
            {sites.map((s) => (
              <SiteStatusRow key={s.id} site={s} />
            ))}
            <RecorderSummary />
            <p className="mt-3 text-xs text-charcoal-400">
              Three hydrophones monitor the restored, degraded, and reference sites in parallel.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
