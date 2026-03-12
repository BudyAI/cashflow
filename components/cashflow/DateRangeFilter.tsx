'use client'
import { useCashflowContext } from './CashflowContext'

export function DateRangeFilter() {
  const { dateFrom, dateTo, setDateFrom, setDateTo } = useCashflowContext()

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4">
      <span className="text-sm font-medium text-slate-600">Date range:</span>
      <input
        type="date"
        value={dateFrom}
        onChange={e => setDateFrom(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-slate-400 text-sm">to</span>
      <input
        type="date"
        value={dateTo}
        onChange={e => setDateTo(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {(dateFrom || dateTo) && (
        <button
          onClick={() => { setDateFrom(''); setDateTo('') }}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Clear
        </button>
      )}
    </div>
  )
}
