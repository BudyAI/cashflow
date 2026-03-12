'use client'
import { Search } from 'lucide-react'
import { useTransactionContext } from './TransactionContext'
import { useCategories } from '@/hooks/useCategories'
import { AddCategoryButton } from './AddCategoryButton'

export function TransactionFilters() {
  const { filters, updateFilter } = useTransactionContext()
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
    </div>
  )
}
