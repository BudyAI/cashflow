'use client'
import { useState } from 'react'
import { CashflowProvider } from './CashflowProvider'
import { DateRangeFilter } from './DateRangeFilter'
import { SummaryCards } from './SummaryCards'
import { MonthlyBarChart } from './MonthlyBarChart'
import { RunningTotalChart } from './RunningTotalChart'
import { MonthlyBurnChart } from './MonthlyBurnChart'
import { AgingDebtChart } from './AgingDebtChart'
import { CashflowTable } from './CashflowTable'
import { ConsolidatedCashflowPanel } from '@/components/cashflow/ConsolidatedCashflowPanel'

type TabId = 'native' | 'consolidated'

export function CashflowTabsLayout() {
  const [tab, setTab] = useState<TabId>('native')

  return (
    <CashflowProvider>
      <DateRangeFilter />
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => setTab('native')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'native' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Solo
        </button>
        <button
          type="button"
          onClick={() => setTab('consolidated')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'consolidated' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Consolidated
        </button>
      </div>

      {tab === 'native' ? (
        <div className="space-y-6">
          <SummaryCards />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyBarChart />
            <RunningTotalChart />
            <MonthlyBurnChart />
            <AgingDebtChart />
          </div>
          <CashflowTable />
        </div>
      ) : (
        <ConsolidatedCashflowPanel />
      )}
    </CashflowProvider>
  )
}
