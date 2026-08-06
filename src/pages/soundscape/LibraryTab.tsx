import { useState, useMemo } from 'react'
import { Search, ChevronUp, ChevronDown, Download, Trash2, Tag, Flag, Ban, FileJson } from 'lucide-react'
import { useSoundscape } from '../../soundscape/SoundscapeContext'
import type { HabitatCategory, QualityStatus } from '../../soundscape/types'
import { HABITAT_LABELS } from '../../soundscape/types'
import { HabitatBadge, QualityBadge, MetricSourceBadge } from '../../components/SoundscapeBadges'
import { downloadCSV, downloadRecordingMetadata } from '../../soundscape/exportUtils'

const PAGE_SIZE = 20

type SortField = 'date' | 'duration' | 'aci' | 'bi' | 'similarity' | 'quality'
type SortDir = 'asc' | 'desc'

export default function LibraryTab() {
  const { state, dispatch, setSelectedRecording, setTab } = useSoundscape()
  const { recordings } = state

  const [search, setSearch] = useState('')
  const [filterHabitat, setFilterHabitat] = useState<HabitatCategory | 'all'>('all')
  const [filterSite, setFilterSite] = useState<string>('all')
  const [filterPeriod, setFilterPeriod] = useState<string>('all')
  const [filterQuality, setFilterQuality] = useState<QualityStatus | 'all'>('all')
  const [filterHasImported, setFilterHasImported] = useState(false)
  const [filterExcluded, setFilterExcluded] = useState<'all' | 'excluded' | 'included'>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [showFilters, setShowFilters] = useState(true)

  const sites = useMemo(() => [...new Set(recordings.map((r) => r.metadata.site).filter(Boolean))], [recordings])
  const periods = useMemo(() => [...new Set(recordings.map((r) => r.metadata.monitoringPeriod).filter(Boolean))], [recordings])

  const filtered = useMemo(() => {
    let result = recordings.filter((r) => {
      if (search) {
        const q = search.toLowerCase()
        const matches =
          r.metadata.name.toLowerCase().includes(q) ||
          r.metadata.site.toLowerCase().includes(q) ||
          r.metadata.recorderId.toLowerCase().includes(q) ||
          r.metadata.notes.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (filterHabitat !== 'all' && r.metadata.habitatCategory !== filterHabitat) return false
      if (filterSite !== 'all' && r.metadata.site !== filterSite) return false
      if (filterPeriod !== 'all' && r.metadata.monitoringPeriod !== filterPeriod) return false
      if (filterQuality !== 'all' && r.quality.status !== filterQuality) return false
      if (filterHasImported && !r.importedFeatures) return false
      if (filterExcluded === 'excluded' && r.quality.status !== 'excluded') return false
      if (filterExcluded === 'included' && r.quality.status === 'excluded') return false
      if (filterDateFrom && new Date(r.metadata.timestamp) < new Date(filterDateFrom)) return false
      if (filterDateTo && new Date(r.metadata.timestamp) > new Date(filterDateTo + 'T23:59:59')) return false
      return true
    })

    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'date':
          cmp = new Date(a.metadata.timestamp).getTime() - new Date(b.metadata.timestamp).getTime()
          break
        case 'duration':
          cmp = (a.browserFeatures?.duration ?? 0) - (b.browserFeatures?.duration ?? 0)
          break
        case 'aci':
          cmp = (a.importedFeatures?.aci ?? -1) - (b.importedFeatures?.aci ?? -1)
          break
        case 'bi':
          cmp = (a.importedFeatures?.bi ?? -1) - (b.importedFeatures?.bi ?? -1)
          break
        case 'similarity':
          cmp = (a.comparison?.healthyReferenceSimilarity ?? -1) - (b.comparison?.healthyReferenceSimilarity ?? -1)
          break
        case 'quality':
          const order = { good: 0, review: 1, excluded: 2 }
          cmp = order[a.quality.status] - order[b.quality.status]
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [recordings, search, filterHabitat, filterSite, filterPeriod, filterQuality, filterHasImported, filterExcluded, filterDateFrom, filterDateTo, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(0, totalPages - 1))
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (pageItems.every((r) => selected.has(r.id))) {
      setSelected((prev) => {
        const next = new Set(prev)
        pageItems.forEach((r) => next.delete(r.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        pageItems.forEach((r) => next.add(r.id))
        return next
      })
    }
  }

  const batchChangeHabitat = (habitat: HabitatCategory) => {
    dispatch({ type: 'BATCH_UPDATE_HABITAT', ids: [...selected], habitat })
    setSelected(new Set())
  }
  const batchMarkReview = () => {
    dispatch({ type: 'BATCH_MARK_REVIEW', ids: [...selected] })
    setSelected(new Set())
  }
  const batchExclude = () => {
    dispatch({ type: 'BATCH_EXCLUDE', ids: [...selected] })
    setSelected(new Set())
  }
  const batchRemove = () => {
    dispatch({ type: 'BATCH_REMOVE', ids: [...selected] })
    setSelected(new Set())
  }
  const batchExport = () => {
    const selectedRecordings = recordings.filter((r) => selected.has(r.id))
    downloadCSV(selectedRecordings, 'recording_metadata.csv')
  }

  const openDetail = (id: string) => {
    setSelectedRecording(id)
    setTab('detail')
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 opacity-30" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-400" />
            <input
              type="text"
              placeholder="Search by name, site, recorder ID, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-charcoal-200 bg-white pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm font-medium text-charcoal-600 hover:bg-sand-50 transition-colors"
          >
            {showFilters ? 'Hide filters' : 'Show filters'}
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <select
              value={filterHabitat}
              onChange={(e) => setFilterHabitat(e.target.value as HabitatCategory | 'all')}
              className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
            >
              <option value="all">All habitats</option>
              {(Object.keys(HABITAT_LABELS) as HabitatCategory[]).map((h) => (
                <option key={h} value={h}>{HABITAT_LABELS[h]}</option>
              ))}
            </select>
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
            >
              <option value="all">All sites</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
            >
              <option value="all">All periods</option>
              {periods.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={filterQuality}
              onChange={(e) => setFilterQuality(e.target.value as QualityStatus | 'all')}
              className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
            >
              <option value="all">All quality</option>
              <option value="good">Good</option>
              <option value="review">Review recommended</option>
              <option value="excluded">Excluded</option>
            </select>
            <select
              value={filterExcluded}
              onChange={(e) => setFilterExcluded(e.target.value as 'all' | 'excluded' | 'included')}
              className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
            >
              <option value="all">Included & excluded</option>
              <option value="included">Included only</option>
              <option value="excluded">Excluded only</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-charcoal-600">
              <input
                type="checkbox"
                checked={filterHasImported}
                onChange={(e) => setFilterHasImported(e.target.checked)}
                className="rounded"
              />
              Has imported metrics
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
              aria-label="Date from"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="rounded-md border border-charcoal-200 bg-white px-2.5 py-1.5 text-xs"
              aria-label="Date to"
            />
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="card p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-charcoal-700">{selected.size} selected</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              onChange={(e) => { if (e.target.value) batchChangeHabitat(e.target.value as HabitatCategory); e.target.value = '' }}
              className="rounded-md border border-charcoal-200 bg-white px-2 py-1 text-xs"
              defaultValue=""
            >
              <option value="">Change habitat...</option>
              {(Object.keys(HABITAT_LABELS) as HabitatCategory[]).map((h) => (
                <option key={h} value={h}>{HABITAT_LABELS[h]}</option>
              ))}
            </select>
            <button onClick={batchMarkReview} className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 transition-colors">
              <Flag className="h-3 w-3" /> Mark for review
            </button>
            <button onClick={batchExclude} className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 transition-colors">
              <Ban className="h-3 w-3" /> Exclude
            </button>
            <button onClick={batchExport} className="flex items-center gap-1 rounded-md bg-ocean-50 px-2 py-1 text-xs text-ocean-700 hover:bg-ocean-100 transition-colors">
              <Download className="h-3 w-3" /> Export metadata
            </button>
            <button onClick={batchRemove} className="flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 transition-colors">
              <Trash2 className="h-3 w-3" /> Remove from session
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-100 bg-sand-50">
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={pageItems.length > 0 && pageItems.every((r) => selected.has(r.id))}
                    onChange={toggleSelectAll}
                    aria-label="Select all on page"
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500">Recording</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500">Habitat</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500">Site</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500 cursor-pointer" onClick={() => toggleSort('date')}>
                  <span className="inline-flex items-center gap-1">Date <SortIcon field="date" /></span>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500 cursor-pointer" onClick={() => toggleSort('duration')}>
                  <span className="inline-flex items-center gap-1">Duration <SortIcon field="duration" /></span>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500">Quality</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500 cursor-pointer" onClick={() => toggleSort('aci')}>
                  <span className="inline-flex items-center gap-1">ACI <SortIcon field="aci" /></span>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500 cursor-pointer" onClick={() => toggleSort('bi')}>
                  <span className="inline-flex items-center gap-1">BI <SortIcon field="bi" /></span>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500 cursor-pointer" onClick={() => toggleSort('similarity')}>
                  <span className="inline-flex items-center gap-1">Sim. <SortIcon field="similarity" /></span>
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-charcoal-500">Source</th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase text-charcoal-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((rec) => (
                <tr
                  key={rec.id}
                  className="border-b border-charcoal-50 hover:bg-sand-50/50 transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(rec.id)}
                      onChange={() => toggleSelect(rec.id)}
                      aria-label={`Select ${rec.metadata.name}`}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => openDetail(rec.id)}
                      className="text-left text-sm font-medium text-charcoal-800 hover:text-forest-700 transition-colors"
                    >
                      {rec.metadata.name}
                    </button>
                    {rec.audioAssetNote && (
                      <p className="text-[10px] text-charcoal-400 mt-0.5">{rec.audioAssetNote}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><HabitatBadge category={rec.metadata.habitatCategory} size="xs" /></td>
                  <td className="px-3 py-2.5 text-xs text-charcoal-600">{rec.metadata.site || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-charcoal-600 tabular-nums">{new Date(rec.metadata.timestamp).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5 text-xs text-charcoal-600 tabular-nums">{rec.browserFeatures?.duration.toFixed(1) ?? '—'}s</td>
                  <td className="px-3 py-2.5"><QualityBadge status={rec.quality.status} size="xs" /></td>
                  <td className="px-3 py-2.5 text-xs text-charcoal-600 tabular-nums">{rec.importedFeatures?.aci?.toFixed(2) ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-charcoal-600 tabular-nums">{rec.importedFeatures?.bi?.toFixed(1) ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-charcoal-600 tabular-nums">
                    {rec.comparison?.healthyReferenceSimilarity != null ? `${(rec.comparison.healthyReferenceSimilarity * 100).toFixed(0)}%` : '—'}
                  </td>
                  <td className="px-3 py-2.5"><MetricSourceBadge source={rec.metricSource} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => downloadRecordingMetadata(rec)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-charcoal-400 hover:bg-sand-100 transition-colors"
                        aria-label="Download metadata JSON"
                      >
                        <FileJson className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-sm text-charcoal-400">
                    No recordings match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-charcoal-100">
            <span className="text-xs text-charcoal-400">
              {filtered.length} recordings · Page {currentPage + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="rounded-md border border-charcoal-200 px-2.5 py-1 text-xs text-charcoal-600 hover:bg-sand-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="rounded-md border border-charcoal-200 px-2.5 py-1 text-xs text-charcoal-600 hover:bg-sand-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

void Tag
