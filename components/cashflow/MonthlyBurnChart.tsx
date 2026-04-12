'use client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LabelList,
} from 'recharts'
import type { CashflowSummary, Currency } from '@/types'
import { useCashflowContext, formatK } from './CashflowContext'

type Props = {
  summary?: CashflowSummary
  currency?: Currency
  isLoading?: boolean
  suppressContextSummary?: boolean
}

export function MonthlyBurnChart({
  summary: summaryProp,
  currency: currencyProp,
  isLoading: isLoadingProp,
  suppressContextSummary,
}: Props = {}) {
  const ctx = useCashflowContext()
  const summary = suppressContextSummary ? summaryProp : (summaryProp ?? ctx.summary)
  const currency = currencyProp ?? ctx.currency
  const isLoading = isLoadingProp ?? ctx.isLoading

  if (isLoading) {
    return <div className="animate-pulse bg-slate-100 rounded-xl h-80" />
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
        No chart data.
      </div>
    )
  }

  const data = (summary.periods ?? []).map(p => ({
    month: p.month,
    net: p.income - p.expenses,
  }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-4">Monthly Burn Rate</h3>
      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tickFormatter={v => formatK(v, currency)} tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <Tooltip
              formatter={(value) => [formatK(Number(value), currency), 'Net (Income − Expenses)']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="net" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.net >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
              <LabelList
                dataKey="net"
                position="inside"
                fontSize={11}
                formatter={(value: unknown) => formatK(Number(value), currency)}
                fill="#ffffff"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
