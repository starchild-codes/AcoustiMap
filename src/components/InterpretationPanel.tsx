interface InterpretationRow {
  label: string
  value: string
}

export default function InterpretationPanel({
  text,
  rows,
}: {
  text: string
  rows: InterpretationRow[]
}) {
  return (
    <div className="card p-6 flex flex-col gap-5">
      <h2 className="font-display text-xl font-semibold text-forest-900">What this means</h2>
      <p className="text-sm leading-relaxed text-forest-700">{text}</p>
      <div className="flex flex-col divide-y divide-forest-100">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-3">
            <span className="text-sm text-forest-600">{row.label}</span>
            <span className="text-sm font-semibold text-forest-900">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
