'use client'
import { useState, useRef, useEffect } from 'react'
import { useCashflowContext } from './CashflowContext'
import { useForecast } from '@/hooks/useForecast'

const FORECAST_MONTHS = 3

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', { month: 'short', year: '2-digit' })
}

function getNextMonths(lastMonth: string, count: number): string[] {
  const [year, month] = lastMonth.split('-').map(Number)
  const result: string[] = []
  for (let i = 1; i <= count; i++) {
    const d = new Date(year, month - 1 + i, 1)
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return result
}

function ForecastCell({ month, rowKey, getValue, setValue }: {
  month: string
  rowKey: string
  getValue: (m: string, k: string) => number | null
  setValue: (m: string, k: string, v: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const current = getValue(month, rowKey)

  useEffect(() => {
    if (editing) {
      setDraft(current !== null ? String(current) : '')
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, current])

  function commit() {
    const num = parseFloat(draft.replace(/,/g, ''))
    setValue(month, rowKey, isNaN(num) ? null : num)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-full text-right text-sm font-mono bg-amber-50 border border-amber-300 rounded px-1 outline-none"
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="block w-full text-right cursor-pointer hover:bg-amber-50 rounded px-1 text-slate-400 hover:text-slate-700 transition-colors"
      title="Click to enter forecast"
    >
      {current !== null ? fmt(current) : '—'}
    </span>
  )
}

const HEADER_CLASS = 'px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap'
const FORECAST_HEADER_CLASS = 'px-3 py-2 text-right text-xs font-semibold text-amber-500 uppercase tracking-wide whitespace-nowrap border-l border-dashed border-amber-200'
const LABEL_CLASS = 'sticky left-0 bg-white px-4 py-2.5 text-sm text-slate-700 whitespace-nowrap border-r border-slate-100 z-10'
const CELL_CLASS = 'px-3 py-2.5 text-right text-sm tabular-nums whitespace-nowrap'
const FORECAST_CELL_CLASS = 'px-3 py-2.5 text-sm tabular-nums whitespace-nowrap border-l border-dashed border-amber-100'
const SECTION_LABEL = 'sticky left-0 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide border-r border-slate-100 z-10'

export function CashflowTable() {
  const { summary, isLoading } = useCashflowContext()
  const { getValue, setValue } = useForecast()

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded" />)}
        </div>
      </div>
    )
  }

  if (!summary || summary.months.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
        No data available
      </div>
    )
  }

  const { months, income, incomeCategories = [], expenseCategories = [], totalExpensesPerMonth, beginningBalances, endingBalances } = summary
  const lastMonth = months[months.length - 1]
  const forecastMonths = getNextMonths(lastMonth, FORECAST_MONTHS)

  // Compute forecast ending balances cascading from last actual ending balance
  const forecastBeginning: Record<string, number> = {}
  const forecastEnding: Record<string, number> = {}
  let runningForecast = endingBalances[lastMonth] ?? 0
  for (const fm of forecastMonths) {
    forecastBeginning[fm] = runningForecast
    const inc = getValue(fm, 'income:total') ?? incomeCategories.reduce((s, cat) => s + (getValue(fm, `income:${cat.id}`) ?? 0), 0)
    const exp = getValue(fm, 'expenses:total') ?? expenseCategories.reduce((s, cat) => s + (getValue(fm, cat.id) ?? 0), 0)
    runningForecast = runningForecast + inc - exp
    forecastEnding[fm] = runningForecast
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="font-semibold text-slate-900">Cashflow Table</h3>
        <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
          <span className="inline-block w-3 border-t-2 border-dashed border-amber-400" />
          Forecast — click cells to edit
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide border-r border-slate-100 z-10 min-w-44">
                Category
              </th>
              {months.map(m => (
                <th key={m} className={HEADER_CLASS}>{monthLabel(m)}</th>
              ))}
              {forecastMonths.map(m => (
                <th key={m} className={FORECAST_HEADER_CLASS}>
                  {monthLabel(m)}
                  <span className="ml-1 text-amber-300 text-xs">★</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>

            {/* Beginning Balance */}
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <td className={LABEL_CLASS + ' font-semibold text-slate-600'}>Beginning Balance</td>
              {months.map(m => (
                <td key={m} className={CELL_CLASS + ' font-semibold text-slate-700'}>
                  {fmt(beginningBalances[m])}
                </td>
              ))}
              {forecastMonths.map(m => (
                <td key={m} className={FORECAST_CELL_CLASS + ' font-semibold text-amber-700 bg-amber-50/30'}>
                  {fmt(forecastBeginning[m])}
                </td>
              ))}
            </tr>

            {/* Income section header */}
            <tr className="border-b border-slate-100 bg-green-50/60">
              <td className={SECTION_LABEL.replace('bg-slate-50', 'bg-green-50') + ' text-green-600'}>Income</td>
              {months.map(m => (
                <td key={m} className="bg-green-50/60 px-3 py-2">
                  <ForecastCell month={m} rowKey="income:total" getValue={getValue} setValue={setValue} />
                </td>
              ))}
              {forecastMonths.map(m => (
                <td key={m} className={FORECAST_CELL_CLASS + ' bg-amber-50/30'}>
                  <ForecastCell month={m} rowKey="income:total" getValue={getValue} setValue={setValue} />
                </td>
              ))}
            </tr>

            {/* Each income category */}
            {incomeCategories.map((cat, i) => (
              <tr key={cat.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-green-50/10'}`}>
                <td className={LABEL_CLASS}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </td>
                {months.map(m => (
                  <td key={m} className={CELL_CLASS + ' text-green-600'}>
                    {cat.totals[m] ? fmt(cat.totals[m]) : '—'}
                  </td>
                ))}
                {forecastMonths.map(m => (
                  <td key={m} className={FORECAST_CELL_CLASS + ' bg-amber-50/30'}>
                    <ForecastCell month={m} rowKey={`income:${cat.id}`} getValue={getValue} setValue={setValue} />
                  </td>
                ))}
              </tr>
            ))}

            {/* Total Income */}
            <tr className="bg-green-50/40 border-t border-t-green-300 border-b border-b-green-300">
              <td className={LABEL_CLASS + ' font-semibold text-green-700'}>Total Income</td>
              {months.map(m => (
                <td key={m} className={CELL_CLASS + ' font-semibold text-green-700'}>
                  {income[m] ? fmt(income[m]) : '—'}
                </td>
              ))}
              {forecastMonths.map(m => {
                const total = getValue(m, 'income:total') ?? incomeCategories.reduce((s, cat) => s + (getValue(m, `income:${cat.id}`) ?? 0), 0)
                return (
                  <td key={m} className={FORECAST_CELL_CLASS + ' font-semibold text-green-400 bg-amber-50/30'}>
                    {total > 0 ? fmt(total) : '—'}
                  </td>
                )
              })}
            </tr>

            {/* Expense categories section header */}
            <tr className="border-b border-slate-100 bg-slate-50">
              <td className={SECTION_LABEL}>Expenses</td>
              {months.map(m => (
                <td key={m} className="bg-slate-50 px-3 py-2">
                  <ForecastCell month={m} rowKey="expenses:total" getValue={getValue} setValue={setValue} />
                </td>
              ))}
              {forecastMonths.map(m => (
                <td key={m} className={FORECAST_CELL_CLASS + ' bg-amber-50/30'}>
                  <ForecastCell month={m} rowKey="expenses:total" getValue={getValue} setValue={setValue} />
                </td>
              ))}
            </tr>

            {/* Each expense category */}
            {expenseCategories.map((cat, i) => (
              <tr key={cat.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                <td className={LABEL_CLASS}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </div>
                </td>
                {months.map(m => (
                  <td key={m} className={CELL_CLASS + ' text-red-600'}>
                    {cat.totals[m] ? fmt(cat.totals[m]) : '—'}
                  </td>
                ))}
                {forecastMonths.map(m => (
                  <td key={m} className={FORECAST_CELL_CLASS + ' bg-amber-50/30'}>
                    <ForecastCell month={m} rowKey={cat.id} getValue={getValue} setValue={setValue} />
                  </td>
                ))}
              </tr>
            ))}

            {/* Total Expenses */}
            <tr className="bg-red-50/40 border-t border-t-red-300 border-b border-b-red-300">
              <td className={LABEL_CLASS + ' font-semibold text-red-700'}>Total Expenses</td>
              {months.map(m => (
                <td key={m} className={CELL_CLASS + ' font-semibold text-red-700'}>
                  {totalExpensesPerMonth[m] ? fmt(totalExpensesPerMonth[m]) : '—'}
                </td>
              ))}
              {forecastMonths.map(m => {
                const total = getValue(m, 'expenses:total') ?? expenseCategories.reduce((s, cat) => s + (getValue(m, cat.id) ?? 0), 0)
                return (
                  <td key={m} className={FORECAST_CELL_CLASS + ' font-semibold text-red-400 bg-amber-50/30'}>
                    {total > 0 ? fmt(total) : '—'}
                  </td>
                )
              })}
            </tr>

            {/* Ending Balance */}
            <tr className="bg-slate-800">
              <td className="sticky left-0 bg-slate-800 px-4 py-3 text-sm font-bold text-white whitespace-nowrap border-r border-slate-700 z-10">
                Ending Balance
              </td>
              {months.map(m => {
                const val = endingBalances[m]
                return (
                  <td key={m} className={`px-3 py-3 text-right text-sm font-bold tabular-nums whitespace-nowrap ${val >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {fmt(val)}
                  </td>
                )
              })}
              {forecastMonths.map(m => {
                const val = forecastEnding[m]
                return (
                  <td key={m} className={`px-3 py-3 text-right text-sm font-bold tabular-nums whitespace-nowrap border-l border-dashed border-slate-600 bg-slate-700 ${val >= 0 ? 'text-amber-300' : 'text-red-400'}`}>
                    {fmt(val)}
                  </td>
                )
              })}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  )
}
