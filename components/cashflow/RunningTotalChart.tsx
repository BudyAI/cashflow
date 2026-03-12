'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useCashflowContext } from './CashflowContext'

function formatK(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

export function RunningTotalChart() {
  const { summary, isLoading } = useCashflowContext()

  if (isLoading) {
    return <div className="animate-pulse bg-slate-100 rounded-xl h-80" />
  }

  const data = (summary?.periods ?? []).map(p => ({
    month: p.month,
    'Running Total': p.runningTotal,
  }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Running Cash Balance</h3>
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip
              formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Running Total']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="Running Total"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
