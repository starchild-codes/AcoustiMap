import { CircleAlert as AlertCircle } from 'lucide-react'

interface InterpretationRow {
  label: string
  value: string
}

export default function InterpretationPanel({
  text,
  rows,
  limitations,
}: {
  text: string
  rows: InterpretationRow[]
  limitations: string
}) {
  return (
    <div className="card p-6 flex flex-col gap-5">
      <h2 className="section-title text-xl">Scientific Interpretation</h2>
      <p className="text-sm leading-relaxed text-charcoal-700">{text}</p>

      <div className="flex flex-col divide-y divide-charcoal-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2.5">
            <span className="text-sm text-charcoal-600">{row.label}</span>
            <span className="text-sm font-semibold text-charcoal-900 tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2.5 rounded-lg bg-amber-50/60 border border-amber-100 px-3.5 py-3">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-charcoal-600">
          <span className="font-medium text-amber-800">Limitations: </span>
          {limitations}
        </p>
      </div>
    </div>
  )
}
