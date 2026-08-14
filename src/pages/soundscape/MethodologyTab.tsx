import { TriangleAlert as AlertTriangle, CircleCheck as CheckCircle2, Database, Cpu, FileAudio, ArrowRight } from 'lucide-react'

export default function MethodologyTab() {
  const steps = [
    { icon: FileAudio, title: 'Audio is loaded in the browser', desc: 'Recordings are uploaded via the browser and decoded using the Web Audio API. Files are not sent to any server.' },
    { icon: Cpu, title: 'Technical quality features are calculated locally', desc: 'Duration, RMS, peak amplitude, clipping, silence, zero-crossing rate, and frequency-band energy are computed from decoded samples.' },
    { icon: Database, title: 'Scientific ecoacoustic metrics are generated in Python', desc: 'ACI, the Biological-Band Spectral Magnitude Ratio (×10), spectral entropy, and reference distances are computed by the backend Python pipeline.' },
    { icon: ArrowRight, title: 'Python outputs are imported as structured JSON', desc: 'Results are imported via the Analysis Data tab and validated against the expected schema.' },
    { icon: ArrowRight, title: 'Recordings are matched by ID or filename', desc: 'Imported records are matched to uploaded audio using exact recording ID, exact filename, or normalised filename without extension.' },
    { icon: ArrowRight, title: 'Healthy, restored, and degraded recordings are compared', desc: 'Three-way comparison shows aligned audio players, waveforms, spectrograms, and metrics side by side.' },
    { icon: ArrowRight, title: 'Results are shown with confidence and limitations', desc: 'Every output is labelled with its source (browser, Python, manual, or prototype). Scientific limitations are displayed prominently.' },
  ]

  const table: { output: string; where: string; interpretation: string }[] = [
    { output: 'Duration and RMS', where: 'Browser', interpretation: 'Recording property' },
    { output: 'Clipping and silence', where: 'Browser', interpretation: 'Quality-control indicator' },
    { output: 'Waveform', where: 'Browser', interpretation: 'Amplitude over time' },
    { output: 'Spectrogram', where: 'Browser', interpretation: 'Frequency energy over time' },
    { output: 'ACI', where: 'Python pipeline', interpretation: 'Ecoacoustic feature' },
    { output: 'Biological-Band Spectral Magnitude Ratio (×10)', where: 'Python pipeline', interpretation: 'Configured-band acoustic feature; not canonical BI' },
    { output: 'Reference similarity', where: 'Python pipeline', interpretation: 'Model-dependent comparison' },
    { output: 'Recovery score', where: 'Python pipeline', interpretation: 'Project-level prototype metric' },
    { output: 'Momentum', where: 'Imported or illustrative', interpretation: 'Requires longitudinal data' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-5">
        <h3 className="section-title mb-4">Data Flow</h3>
        <div className="flex flex-col gap-4">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-charcoal-800">
                    {i + 1}. {step.title}
                  </p>
                  <p className="text-xs text-charcoal-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="section-title mb-4">Output Distinction Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-100 bg-sand-50">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500">Output</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500">Calculated where</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row) => (
                <tr key={row.output} className="border-b border-charcoal-50">
                  <td className="px-3 py-2.5 text-sm font-medium text-charcoal-800">{row.output}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      row.where === 'Browser'
                        ? 'bg-ocean-50 text-ocean-700'
                        : row.where === 'Python pipeline'
                        ? 'bg-forest-50 text-forest-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {row.where === 'Browser' && <Cpu className="h-2.5 w-2.5" />}
                      {row.where === 'Python pipeline' && <Database className="h-2.5 w-2.5" />}
                      {row.where === 'Imported or illustrative' && <AlertTriangle className="h-2.5 w-2.5" />}
                      {row.where}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-charcoal-600">{row.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-5 border-amber-200 bg-amber-50/30">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Scientific Limitations</h3>
            <p className="mt-1 text-sm text-amber-800 leading-relaxed">
              Acoustic indices are not direct measures of species richness or total biodiversity. Results require ecological context and external validation.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="section-title mb-3">Metric Source Labelling</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-ocean-600" />
            <span className="text-sm text-charcoal-700"><strong>Browser calculated</strong> — Technical features computed from decoded audio samples using the Web Audio API and an FFT implementation.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-forest-600" />
            <span className="text-sm text-charcoal-700"><strong>Python backend</strong> — Ecoacoustic metrics and reference distances generated by the real backend pipeline.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-charcoal-600" />
            <span className="text-sm text-charcoal-700"><strong>Manual</strong> — User-assigned values or manual matches between imported data and uploaded recordings.</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-charcoal-700"><strong>Prototype illustrative</strong> — Demonstration values from the built-in demo dataset. Not real field data.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
