'use client'
import { TrendingUp, TrendingDown, DollarSign, Flame } from 'lucide-react'
import type { CashflowSummary, Currency } from '@/types'
import { useCashflowContext, formatCurrency } from './CashflowContext'

type Props = {
  summary?: CashflowSummary
  currency?: Currency
  isLoading?: boolean
  /** When true, never fall back to native context summary (used by consolidated tab). */
  suppressContextSummary?: boolean
}

export function SummaryCards({
  summary: summaryProp,
  currency: currencyProp,
  isLoading: isLoadingProp,
  suppressContextSummary,
}: Props = {}) {
  const ctx = useCashflowContext()
  const summary = suppressContextSummary ? summaryProp : (summaryProp ?? ctx.summary)
  const currency = currencyProp ?? ctx.currency
  const isLoading = isLoadingProp ?? ctx.isLoading

  const numMonths = summary?.periods?.length ?? 0
  const burnRate = numMonths > 0 ? (summary?.totalExpenses ?? 0) / numMonths : 0

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-28" />
        ))}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-full rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No consolidated data yet.
        </div>
      </div>
    )
  }

  const cards = [
    {
      label: 'Total Income',
      value: summary?.totalIncome ?? 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
    },
    {
      label: 'Total Expenses',
      value: summary?.totalExpenses ?? 0,
      icon: TrendingDown,
      color: 'text-red-600',
      bg: 'bg-red-50',
      iconColor: 'text-red-500',
    },
    {
      label: 'Net Cashflow',
      value: summary?.netCashflow ?? 0,
      icon: DollarSign,
      color: (summary?.netCashflow ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600',
      bg: (summary?.netCashflow ?? 0) >= 0 ? 'bg-blue-50' : 'bg-orange-50',
      iconColor: (summary?.netCashflow ?? 0) >= 0 ? 'text-blue-500' : 'text-orange-500',
    },
    {
      label: 'Avg Monthly Burn',
      value: burnRate,
      icon: Flame,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      iconColor: 'text-orange-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg, iconColor }) => (
        <div key={label} className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{formatCurrency(value, currency)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
