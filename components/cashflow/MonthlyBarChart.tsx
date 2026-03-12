'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useCashflowContext } from './CashflowContext'

function formatK(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

export function MonthlyBarChart() {
  const { summary, isLoading } = useCashflowContext()

  if (isLoading) {
    return <div className="animate-pulse bg-slate-100 rounded-xl h-80" />
  }

  const data = (summary?.periods ?? []).map(p => ({
    month: p.month,
    Income: p.income,
    Expenses: p.expenses,
  }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Monthly Income vs Expenses</h3>
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tickFormatter={formatK} tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip
              formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Legend />
            <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
