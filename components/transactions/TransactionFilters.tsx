'use client'
import { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { useTransactionContext } from './TransactionContext'
import { useCategories } from '@/hooks/useCategories'
import { AddCategoryButton } from './AddCategoryButton'

export function TransactionFilters() {
  const { filters, updateFilter, mutate } = useTransactionContext()
  const [classifying, setClassifying] = useState(false)

  const handleAutoClassify = async () => {
    setClassifying(true)
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const json = await res.json()
      if (json.count === 0) return

      // Poll until the batch completes, then refresh the table
      const { batchId } = json
      const poll = setInterval(async () => {
        const s = await fetch(`/api/upload/${batchId}/status`).then(r => r.json())
        if (s.status === 'complete' || s.status === 'failed') {
          clearInterval(poll)
          setClassifying(false)
          mutate()
        }
      }, 2000)
    } catch {
      setClassifying(false)
    }
  }
  const { categories } = useCategories()

  return (
    <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search transactions..."
          value={filters.search ?? ''}
          onChange={e => updateFilter('search', e.target.value || undefined)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-1">
        <select
          value={filters.categoryId ?? ''}
          onChange={e => updateFilter('categoryId', e.target.value || undefined)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <AddCategoryButton />
      </div>

      <select
        value={filters.type ?? ''}
        onChange={e => updateFilter('type', (e.target.value as 'income' | 'expense') || undefined)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All types</option>
        <option value="income">Income</option>
        <option value="expense">Expenses</option>
      </select>

      <select
        value={filters.currency ?? ''}
        onChange={e => updateFilter('currency', (e.target.value as 'USD' | 'ILS') || undefined)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All currencies</option>
        <option value="USD">USD</option>
        <option value="ILS">ILS</option>
      </select>

      <input
        type="date"
        value={filters.dateFrom ?? ''}
        onChange={e => updateFilter('dateFrom', e.target.value || undefined)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-slate-400 text-sm">to</span>
      <input
        type="date"
        value={filters.dateTo ?? ''}
        onChange={e => updateFilter('dateTo', e.target.value || undefined)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={handleAutoClassify}
        disabled={classifying}
        className={`ml-auto flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          classifying
            ? 'bg-purple-50 text-purple-400 cursor-not-allowed'
            : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
        }`}
      >
        <Sparkles className={`w-4 h-4 ${classifying ? 'animate-pulse' : ''}`} />
        {classifying ? 'Categorizing…' : 'Auto-categorize'}
      </button>
    </div>
  )
}
