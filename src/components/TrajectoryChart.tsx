import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts'
import { trajectory, interventionPeriodIndex, trajectoryDisclaimer } from '../data/mockData'

const series = [
  { key: 'restored', name: 'Restored Reef', color: '#32729f', width: 3 },
  { key: 'degraded', name: 'Degraded Baseline', color: '#c0b094', width: 2, dashed: true },
  { key: 'healthy', name: 'Healthy Reference', color: '#2c5a37', width: 2.5 },
]

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-forest-900 px-3 py-2.5 text-xs text-sand-50 shadow-lg">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
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
        <h2 className="font-display text-xl font-semibold text-forest-900">
          Acoustic Recovery Trajectory
        </h2>
        <span className="text-xs text-forest-500">Acoustic similarity to healthy reference (%)</span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trajectory} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d2" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 12, fill: '#5a9169' }}
              axisLine={{ stroke: '#dcebe0' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#5a9169' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#bbd6c3', strokeWidth: 1 }} />
            <ReferenceLine
              x={trajectory[interventionPeriodIndex].period}
              stroke="#234a6a"
              strokeDasharray="4 4"
              label={{
                value: 'Coral restoration structures installed',
                position: 'top',
                fill: '#234a6a',
                fontSize: 11,
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="plainline"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={s.width}
                strokeDasharray={s.dashed ? '5 5' : undefined}
                dot={{ r: 3, fill: s.color }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-forest-500 italic border-t border-forest-100 pt-3">
        {trajectoryDisclaimer}
      </p>
    </div>
  )
}
