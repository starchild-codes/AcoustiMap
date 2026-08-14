import type {
  ExportData,
  Recording,
  ProjectInfo,
  AppSettings,
  ComparisonSelections,
  ValidationReport,
} from './types'

export function buildExportData(
  recordings: Recording[],
  project: ProjectInfo,
  settings: AppSettings,
  selections: ComparisonSelections,
): ExportData {
  return {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    project,
    recordings: recordings.map((r) => ({
      id: r.id,
      metadata: r.metadata,
      fileSize: r.fileSize,
      fileType: r.fileType,
      browserFeatures: r.browserFeatures,
      importedFeatures: r.importedFeatures,
      comparison: r.comparison,
      quality: r.quality,
      metricSource: r.metricSource,
      matchedImportedId: r.matchedImportedId,
    })),
    comparisonSelections: selections,
    settings,
  }
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCSV(recordings: Recording[], filename: string): void {
  const headers = [
    'Recording ID',
    'Filename',
    'Habitat category',
    'Site',
    'Timestamp',
    'Duration',
    'Quality status',
    'Exclusion reason',
    'RMS',
    'Peak amplitude',
    'Zero-crossing rate',
    'ACI',
    'Biological-Band Spectral Magnitude Ratio (×10)',
    'Occupancy',
    'Noise pressure',
    'Similarity',
    'Metric source',
  ]

  const rows = recordings.map((r) => [
    r.id,
    r.metadata.filename,
    r.metadata.habitatCategory,
    r.metadata.site,
    r.metadata.timestamp,
    r.browserFeatures?.duration.toFixed(2) ?? '',
    r.quality.status,
    r.quality.exclusionReason ?? '',
    r.browserFeatures?.rmsAmplitude.toFixed(6) ?? '',
    r.browserFeatures?.peakAmplitude.toFixed(6) ?? '',
    r.browserFeatures?.zeroCrossingRate.toFixed(6) ?? '',
    r.importedFeatures?.aci?.toFixed(3) ?? '',
    r.importedFeatures?.bi?.toFixed(3) ?? '',
    r.importedFeatures?.biologicalFrequencyOccupancy?.toFixed(3) ?? '',
    r.importedFeatures?.anthropogenicNoisePressure?.toFixed(3) ?? '',
    r.comparison?.healthyReferenceSimilarity?.toFixed(3) ?? '',
    r.metricSource,
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadValidationReport(report: ValidationReport, filename: string): void {
  downloadJSON(report, filename)
}

export function downloadRecordingMetadata(recording: Recording): void {
  downloadJSON(
    {
      recordingId: recording.id,
      metadata: recording.metadata,
      browserFeatures: recording.browserFeatures,
      importedFeatures: recording.importedFeatures,
      comparison: recording.comparison,
      quality: recording.quality,
      metricSource: recording.metricSource,
      exportedAt: new Date().toISOString(),
    },
    `${recording.metadata.name || recording.id}_metadata.json`,
  )
}

export function generateComparisonReportHTML(
  recordings: Recording[],
  selections: ComparisonSelections,
  project: ProjectInfo,
): string {
  const findRec = (id: string | null) => recordings.find((r) => r.id === id)
  const healthy = findRec(selections.healthy)
  const restored = findRec(selections.restored)
  const degraded = findRec(selections.degraded)

  const metricRow = (label: string, getValue: (r: Recording | undefined) => string) => `
    <tr>
      <td class="label">${label}</td>
      <td>${getValue(healthy)}</td>
      <td>${getValue(restored)}</td>
      <td>${getValue(degraded)}</td>
    </tr>`

  const fmtMetric = (r: Recording | undefined, key: keyof NonNullable<Recording['importedFeatures']>) =>
    r?.importedFeatures?.[key] != null ? (r.importedFeatures[key] as number).toFixed(3) : '—'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>AcoustiMap Restore — Comparison Report</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; color: #24221e; }
  h1 { font-family: Georgia, serif; font-size: 24px; margin-bottom: 4px; }
  h2 { font-family: Georgia, serif; font-size: 18px; margin-top: 32px; margin-bottom: 12px; }
  .subtitle { color: #5f594f; font-size: 14px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e9e7e3; font-size: 13px; }
  th { background: #faf9f6; font-weight: 600; }
  .label { font-weight: 500; color: #5f594f; }
  .warning { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #92400e; }
  .section { margin-bottom: 32px; }
  @media print { body { max-width: none; } }
</style>
</head>
<body>
  <h1>Acoustic Comparison Report</h1>
  <p class="subtitle">${project.name} · ${project.location} · ${project.monitoringPeriod}</p>

  <div class="section">
    <h2>Selected Recordings</h2>
    <table>
      <thead>
        <tr><th>Category</th><th>Recording</th><th>Site</th><th>Duration</th><th>Quality</th></tr>
      </thead>
      <tbody>
        <tr><td>Healthy Reference</td><td>${healthy?.metadata.name ?? '—'}</td><td>${healthy?.metadata.site ?? '—'}</td><td>${healthy?.browserFeatures?.duration.toFixed(1) ?? '—'}s</td><td>${healthy?.quality.status ?? '—'}</td></tr>
        <tr><td>Restored Site</td><td>${restored?.metadata.name ?? '—'}</td><td>${restored?.metadata.site ?? '—'}</td><td>${restored?.browserFeatures?.duration.toFixed(1) ?? '—'}s</td><td>${restored?.quality.status ?? '—'}</td></tr>
        <tr><td>Degraded Comparison</td><td>${degraded?.metadata.name ?? '—'}</td><td>${degraded?.metadata.site ?? '—'}</td><td>${degraded?.browserFeatures?.duration.toFixed(1) ?? '—'}s</td><td>${degraded?.quality.status ?? '—'}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Acoustic Metrics</h2>
    <table>
      <thead><tr><th>Metric</th><th>Healthy</th><th>Restored</th><th>Degraded</th></tr></thead>
      <tbody>
        ${metricRow('ACI', (r) => fmtMetric(r, 'aci'))}
        ${metricRow('Biological-Band Spectral Magnitude Ratio (×10)', (r) => fmtMetric(r, 'bi'))}
        ${metricRow('Biological freq. occupancy', (r) => fmtMetric(r, 'biologicalFrequencyOccupancy'))}
        ${metricRow('Anthropogenic noise pressure', (r) => fmtMetric(r, 'anthropogenicNoisePressure'))}
        ${metricRow('Spectral entropy', (r) => fmtMetric(r, 'spectralEntropy'))}
        ${metricRow('Healthy-ref similarity', (r) => r?.comparison?.healthyReferenceSimilarity != null ? (r.comparison.healthyReferenceSimilarity * 100).toFixed(0) + '%' : '—')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Quality Warnings</h2>
    <table>
      <thead><tr><th>Recording</th><th>Warnings</th><th>Recommendation</th></tr></thead>
      <tbody>
        ${[healthy, restored, degraded].filter(Boolean).map((r) => `
          <tr><td>${r!.metadata.name}</td><td>${r!.quality.warnings.join('; ') || 'None'}</td><td>${r!.quality.autoRecommendation}</td></tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${
    restored?.comparison?.healthyReferenceSimilarity != null && restored?.comparison?.degradedReferenceSimilarity != null
      ? `<div class="section"><h2>Similarity Interpretation</h2>
         <p>The selected restored recording is acoustically closer to the ${restored.comparison.healthyReferenceSimilarity > restored.comparison.degradedReferenceSimilarity ? 'healthy reference' : 'degraded comparison'} under the current feature model.</p></div>`
      : '<div class="section"><h2>Similarity Interpretation</h2><p>Import Python analysis results to calculate reference similarity.</p></div>'
  }

  <div class="warning">
    Acoustic indices are not direct measures of species richness or total biodiversity. Results require ecological context and external validation. This report is a prototype output and should not be used as sole evidence of ecological recovery.
  </div>

  <p style="font-size: 11px; color: #847d72; margin-top: 40px;">
    Generated by AcoustiMap Restore · ${new Date().toLocaleString()} · Schema v1.0
  </p>
</body>
</html>`
}

export function openPrintableReport(html: string): void {
  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
