import { Compass } from 'lucide-react'

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 ring-1 ring-forest-200">
        <Compass className="h-8 w-8" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold text-forest-900">{title}</h2>
      <p className="mt-2 text-sm text-forest-500 max-w-sm">
        Coming next. This section is part of the AcoustiMap Restore roadmap but is not built in this prototype.
      </p>
    </div>
  )
}
