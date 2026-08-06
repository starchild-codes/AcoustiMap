import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  ComposedChart,
} from 'recharts'
import {
  trajectory,
  interventionPeriodIndex,
  divergencePeriodIndex,
  trajectoryDisclaimer,
} from '../data/mockData'
import { Info } from 'lucide-react'

const series = [
  { key: 'restored', name: 'Restored Reef', color: '#32729f', width: 2.5 },
  { key: 'degraded', name: 'Degraded Baseline', color: '#847d72', width: 1.5, dashed: true },
  { key: 'healthy', name: 'Healthy Reference', color: '#2c5a37', width: 2 },
]

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  // Filter out the band area from the tooltip
  const lines = payload.filter((p: any) => p.dataKey !== 'restoredHigh' && p.dataKey !== 'restoredLow')
  return (
    <div className="rounded-lg bg-charcoal-900 px-3 py-2.5 text-xs text-sand-50 shadow-pop">
      <p className="font-semibold mb-1.5">{label}</p>
      {lines.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}: {p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function TrajectoryChart() {
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h2 className="section-title text-xl">Acoustic Recovery Trajectory</h2>
        <span className="text-xs text-charcoal-400">Acoustic similarity to healthy reference (%)</span>
      </div>

      <div className="h-80 sm:h-96 w-full" role="img" aria-label="Line chart showing acoustic recovery trajectory across six monitoring periods. The restored reef line rises from 41 to 74, approaching the healthy reference line which stays near 90. The degraded baseline remains flat near 40. A confidence band surrounds the restored reef line.">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trajectory} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
            <defs>
              <linearGradient id="restoredBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#32729f" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#32729f" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e9e7e3" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: '#847d72' }}
              axisLine={{ stroke: '#d3cfc9' }}
              tickLine={false}
              dy={4}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 11, fill: '#847d72' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#bbd6c3', strokeWidth: 1 }} />
            <ReferenceLine
              x={trajectory[interventionPeriodIndex].period}
              stroke="#234a6a"
              strokeDasharray="5 4"
              strokeWidth={1}
              label={{
                value: 'Coral restoration structures installed',
                position: 'top',
                fill: '#234a6a',
                fontSize: 10,
              }}
            />
            <ReferenceLine
              x={trajectory[divergencePeriodIndex].period}
              stroke="#32729f"
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.5}
              label={{
                value: 'Divergence from baseline',
                position: 'insideTopLeft',
                fill: '#32729f',
                fontSize: 9,
                opacity: 0.7,
              }}
            />
            {/* Confidence band: fill to high, then mask out below low with card bg */}
            <Area
              type="monotone"
              dataKey="restoredHigh"
              stroke="none"
              fill="url(#restoredBand)"
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="restoredLow"
              stroke="none"
              fill="#ffffff"
              legendType="none"
              tooltipType="none"
              isAnimationActive={false}
            />
            <Legend
              verticalAlign="bottom"
              iconType="plainline"
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value) => <span className="text-charcoal-600">{value}</span>}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={s.width}
                strokeDasharray={s.dashed ? '6 4' : undefined}
                dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                isAnimationActive={true}
                animationDuration={800}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer in a subtle neutral info box */}
      <div className="flex items-start gap-2.5 rounded-lg bg-sand-50 border border-charcoal-100 px-4 py-3">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-charcoal-400" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-charcoal-500">
          <span className="font-medium text-charcoal-600">Note: </span>
          {trajectoryDisclaimer}
        </p>
      </div>
    </div>
  )
}
