'use client'
import useSWR, { mutate } from 'swr'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Upload, Trash2 } from 'lucide-react'
import { useCashflowContext, formatK } from './CashflowContext'

interface AgingReport {
  id: string
  reportDate: string
  current: number
  days1to30: number
  days31to60: number
  days61to90: number
  days90plus: number
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const BUCKET_COLORS = {
  Current: '#22c55e', // green
  '1–30 days': '#eab308', // yellow
  '31–60 days': '#f97316', // orange
  '61–90 days': '#ea580c', // dark orange
  '90+ days': '#dc2626', // red
}

export function AgingDebtChart() {
  const { data: reports, isLoading } = useSWR<AgingReport[]>('/api/aging', fetcher)
  const { currency } = useCashflowContext()

  const handleDelete = async (id: string) => {
    await fetch(`/api/aging?id=${id}`, { method: 'DELETE' })
    await mutate('/api/aging')
  }

  if (isLoading) {
    return <div className="animate-pulse bg-slate-100 rounded-xl h-80" />
  }

  const latest = (reports ?? [])[0]

  const chartData = latest
    ? [
        { bucket: 'Current', amount: latest.current, color: BUCKET_COLORS.Current },
        { bucket: '1–30 days', amount: latest.days1to30, color: BUCKET_COLORS['1–30 days'] },
        { bucket: '31–60 days', amount: latest.days31to60, color: BUCKET_COLORS['31–60 days'] },
        { bucket: '61–90 days', amount: latest.days61to90, color: BUCKET_COLORS['61–90 days'] },
        { bucket: '90+ days', amount: latest.days90plus, color: BUCKET_COLORS['90+ days'] },
      ]
    : []

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 col-span-1 lg:col-span-2">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">Aging Debt</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Accounts receivable by overdue bucket{latest ? ` (as of ${formatDate(latest.reportDate)})` : ''}
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
          <Upload className="w-8 h-8 opacity-40" />
          <span>Upload an aging report on the Transactions page to see your debt breakdown</span>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tickFormatter={v => formatK(v, currency)} tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(value) => [formatK(Number(value), currency), '']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.bucket} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Uploaded reports</p>
            <div className="space-y-1">
              {(reports ?? []).map(r => {
                const total = r.current + r.days1to30 + r.days31to60 + r.days61to90 + r.days90plus
                return (
                  <div key={r.id} className="flex items-center justify-between text-xs text-slate-600">
                    <span>{formatDate(r.reportDate)}</span>
                    <span className="text-slate-400">Total: {formatK(total, currency)}</span>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors ml-3"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
