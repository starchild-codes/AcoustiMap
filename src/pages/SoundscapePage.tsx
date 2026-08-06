import { useState } from 'react'
import { MapPin, CalendarDays, Database, Download, FileJson, FileSpreadsheet, Printer, FlaskConical, Upload, ListMusic, GitCompare, Settings2, Loader as Loader2, Trash2 } from 'lucide-react'
import { useSoundscape } from '../soundscape/SoundscapeContext'
import { createDemoRecordings, demoAnalysisImport } from '../soundscape/demoData'
import { buildExportData, downloadJSON, downloadCSV, generateComparisonReportHTML, openPrintableReport } from '../soundscape/exportUtils'
import type { AppSettings } from '../soundscape/types'
import { DEFAULT_THRESHOLDS } from '../soundscape/types'

import CompareTab from './soundscape/CompareTab'
import LibraryTab from './soundscape/LibraryTab'
import UploadTab from './soundscape/UploadTab'
import AnalysisTab from './soundscape/AnalysisTab'
import MethodologyTab from './soundscape/MethodologyTab'
import DetailTab from './soundscape/DetailTab'

const TABS = [
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'library', label: 'Recording Library', icon: ListMusic },
  { id: 'upload', label: 'Upload Recordings', icon: Upload },
  { id: 'analysis', label: 'Analysis Data', icon: Database },
  { id: 'methodology', label: 'Methodology', icon: FlaskConical },
]

export default function SoundscapePage() {
  const { state, setTab, loadDemo, clearAll, setThresholds } = useSoundscape()
  const { recordings, project, settings, activeTab, selections } = state
  const [showExport, setShowExport] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const recordingCount = recordings.length

  const handleLoadDemo = () => {
    setDemoLoading(true)
    setTimeout(() => {
      loadDemo(createDemoRecordings())
      setDemoLoading(false)
    }, 100)
  }

  const handleExportProjectJSON = () => {
    const data = buildExportData(recordings, project, settings, selections)
    downloadJSON(data, 'acoustimap_project_export.json')
  }

  const handleExportCSV = () => {
    downloadCSV(recordings, 'acoustimap_recordings.csv')
  }

  const handleExportReport = () => {
    const html = generateComparisonReportHTML(recordings, selections, project)
    openPrintableReport(html)
  }

  const currentTab = activeTab === 'detail' ? 'library' : activeTab

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-charcoal-900 tracking-tight">
            Soundscape Comparison
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-charcoal-600">
            Compare acoustic structure across healthy, restored, and degraded ecosystem recordings.
          </p>
        </div>

        <div className="card p-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-charcoal-600">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-charcoal-400" />
              <span className="font-medium text-charcoal-500">Project:</span>
              {project.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-medium text-charcoal-500">Location:</span>
              {project.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-medium text-charcoal-500">Ecosystem:</span>
              {project.ecosystem}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-charcoal-400" />
              <span className="font-medium text-charcoal-500">Monitoring period:</span>
              {project.monitoringPeriod}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-charcoal-400" />
              <span className="font-medium text-charcoal-500">Recordings loaded:</span>
              <span className="font-semibold text-charcoal-800 tabular-nums">{recordingCount}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-charcoal-100 bg-white p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = currentTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-forest-50 text-forest-800'
                    : 'text-charcoal-500 hover:bg-sand-50 hover:text-charcoal-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {recordings.length === 0 && (
            <button
              onClick={handleLoadDemo}
              disabled={demoLoading}
              className="flex items-center gap-1.5 rounded-lg bg-forest-700 px-3 py-1.5 text-sm font-medium text-sand-50 hover:bg-forest-800 transition-colors disabled:opacity-50"
            >
              {demoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
              Load Demonstration Dataset
            </button>
          )}
          <button
            onClick={() => setShowExport((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-charcoal-200 bg-white px-3 py-1.5 text-sm font-medium text-charcoal-600 hover:bg-sand-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export Analysis
          </button>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-charcoal-200 bg-white px-3 py-1.5 text-sm font-medium text-charcoal-600 hover:bg-sand-50 transition-colors"
            aria-label="Quality threshold settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
          {recordings.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {showExport && (
        <div className="card p-4">
          <h3 className="section-title mb-3">Export Options</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportProjectJSON}
              className="flex items-center gap-1.5 rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-sand-50 transition-colors"
            >
              <FileJson className="h-4 w-4 text-forest-600" />
              Project JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-sand-50 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4 text-ocean-600" />
              Recording CSV
            </button>
            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-sand-50 transition-colors"
            >
              <Printer className="h-4 w-4 text-charcoal-600" />
              Comparison report (print)
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <QualitySettingsPanel
          settings={settings}
          onThresholdsChange={setThresholds}
          onClose={() => setShowSettings(false)}
        />
      )}

      {confirmClear && (
        <div className="card p-4 border-rose-200">
          <p className="text-sm text-charcoal-700 mb-3">
            This will remove all recordings, metadata, and quality decisions from the session. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { clearAll(); setConfirmClear(false) }}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
            >
              Yes, clear all
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="rounded-lg border border-charcoal-200 px-3 py-1.5 text-sm font-medium text-charcoal-600 hover:bg-sand-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="min-h-[400px]">
        {activeTab === 'compare' && <CompareTab />}
        {activeTab === 'library' && <LibraryTab />}
        {activeTab === 'detail' && <DetailTab />}
        {activeTab === 'upload' && <UploadTab />}
        {activeTab === 'analysis' && <AnalysisTab />}
        {activeTab === 'methodology' && <MethodologyTab />}
      </div>
    </div>
  )

  void demoAnalysisImport
}

function QualitySettingsPanel({
  settings,
  onThresholdsChange,
  onClose,
}: {
  settings: AppSettings
  onThresholdsChange: (t: Partial<typeof DEFAULT_THRESHOLDS>) => void
  onClose: () => void
}) {
  const t = settings.qualityThresholds
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title">Quality Threshold Settings</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onThresholdsChange(DEFAULT_THRESHOLDS)}
            className="text-xs text-forest-600 hover:text-forest-700 font-medium"
          >
            Reset to defaults
          </button>
          <button onClick={onClose} className="text-xs text-charcoal-400 hover:text-charcoal-600">Close</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <ThresholdInput
          label="Clipping % (max)"
          value={t.clippingPercent}
          onChange={(v) => onThresholdsChange({ clippingPercent: v })}
          step={0.1}
          min={0}
          max={10}
        />
        <ThresholdInput
          label="Silence proportion (max)"
          value={t.silenceProportion}
          onChange={(v) => onThresholdsChange({ silenceProportion: v })}
          step={0.05}
          min={0}
          max={1}
        />
        <ThresholdInput
          label="Min RMS amplitude"
          value={t.minRms}
          onChange={(v) => onThresholdsChange({ minRms: v })}
          step={0.001}
          min={0}
          max={0.1}
        />
        <ThresholdInput
          label="Min duration (s)"
          value={t.minDuration}
          onChange={(v) => onThresholdsChange({ minDuration: v })}
          step={1}
          min={0}
          max={60}
        />
        <ThresholdInput
          label="Max duration (s)"
          value={t.maxDuration}
          onChange={(v) => onThresholdsChange({ maxDuration: v })}
          step={10}
          min={60}
          max={3600}
        />
        <ThresholdInput
          label="Low-freq noise ratio (max)"
          value={t.lowFreqNoiseRatio}
          onChange={(v) => onThresholdsChange({ lowFreqNoiseRatio: v })}
          step={0.05}
          min={0}
          max={1}
        />
      </div>
      <p className="mt-3 text-xs text-charcoal-400">
        These thresholds control automatic quality warnings. Recordings are never automatically excluded — the user makes the final decision.
      </p>
    </div>
  )
}

function ThresholdInput({
  label,
  value,
  onChange,
  step,
  min,
  max,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step: number
  min: number
  max: number
}) {
  return (
    <div>
      <label className="text-[10px] font-medium uppercase text-charcoal-400">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
        min={min}
        max={max}
        className="w-full rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
      />
    </div>
  )
}
