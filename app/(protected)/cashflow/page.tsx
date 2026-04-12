import { CashflowTabsLayout } from '@/components/cashflow/CashflowTabsLayout'

export default function CashflowPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Cashflow Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          Monthly income and expense breakdown
        </p>
      </div>
      <CashflowTabsLayout />
    </div>
  )
}
