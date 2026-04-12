'use client'
import { useMemo, useState } from 'react'
import useSWR from 'swr'
import type { ConsolidatedCashflowResponse, Currency } from '@/types'
import { useCashflowContext } from './CashflowContext'
import { SummaryCards } from './SummaryCards'
import { MonthlyBarChart } from './MonthlyBarChart'
import { RunningTotalChart } from './RunningTotalChart'
import { MonthlyBurnChart } from './MonthlyBurnChart'
import { CashflowTable } from './CashflowTable'

async function consolidatedFetcher(url: string): Promise<ConsolidatedCashflowResponse> {
  const res = await fetch(url)
  const j = (await res.json()) as ConsolidatedCashflowResponse & { error?: string; missingDays?: string[] }
  if (!res.ok) {
    const extra = j.missingDays?.length ? ` (${j.missingDays.slice(0, 3).join(', ')}…)` : ''
    throw new Error((j.error ?? res.statusText) + extra)
  }
  return j as ConsolidatedCashflowResponse
}

export function ConsolidatedCashflowPanel() {
  const { dateFrom, dateTo } = useCashflowContext()
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD')

  const key = useMemo(() => {
    const p = new URLSearchParams()
    if (dateFrom) p.set('dateFrom', dateFrom)
    if (dateTo) p.set('dateTo', dateTo)
    p.set('displayCurrency', displayCurrency)
    return `/api/cashflow/consolidated?${p.toString()}`
  }, [dateFrom, dateTo, displayCurrency])

  const { data, error, isLoading } = useSWR<ConsolidatedCashflowResponse>(key, consolidatedFetcher)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border border-slate-200 p-4">
        <span className="text-sm font-medium text-slate-600">Display amounts in</span>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {(['USD', 'ILS'] as const).map(code => (
            <button
              key={code}
              type="button"
              onClick={() => setDisplayCurrency(code)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                displayCurrency === code
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {code === 'USD' ? '$ USD' : '₪ ILS'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error instanceof Error ? error.message : 'Could not load consolidated cashflow.'}
        </div>
      )}

      <SummaryCards
        summary={data}
        currency={displayCurrency}
        isLoading={isLoading}
        suppressContextSummary
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyBarChart
          summary={data}
          currency={displayCurrency}
          isLoading={isLoading}
          suppressContextSummary
        />
        <RunningTotalChart
          summary={data}
          currency={displayCurrency}
          isLoading={isLoading}
          suppressContextSummary
        />
        <MonthlyBurnChart
          summary={data}
          currency={displayCurrency}
          isLoading={isLoading}
          suppressContextSummary
        />
      </div>
      <CashflowTable summary={data} isLoading={isLoading} suppressContextSummary />
      {data?.meta && (
        <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">{data.meta.note}</p>
      )}
    </div>
  )
}
