import { CashflowProvider } from '@/components/cashflow/CashflowProvider'
import { SummaryCards } from '@/components/cashflow/SummaryCards'
import { MonthlyBarChart } from '@/components/cashflow/MonthlyBarChart'
import { RunningTotalChart } from '@/components/cashflow/RunningTotalChart'
import { MonthlyBurnChart } from '@/components/cashflow/MonthlyBurnChart'
import { AgingDebtChart } from '@/components/cashflow/AgingDebtChart'
import { DateRangeFilter } from '@/components/cashflow/DateRangeFilter'
import { CashflowTable } from '@/components/cashflow/CashflowTable'

export default function CashflowPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cashflow Dashboard</h1>
        <p className="text-slate-500 mt-1">Monthly income and expense breakdown</p>
      </div>
      <CashflowProvider>
        <DateRangeFilter />
        <SummaryCards />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyBarChart />
          <RunningTotalChart />
          <MonthlyBurnChart />
          <AgingDebtChart />
        </div>
        <CashflowTable />
      </CashflowProvider>
    </div>
  )
}
