'use client'
import { useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { useTransactionContext } from './TransactionContext'
import { CategorySelect } from './CategorySelect'
import type { TransactionWithCategory } from '@/types'

function formatAmount(amount: number): string {
  const abs = Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return amount >= 0 ? `+$${abs}` : `-$${abs}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function TransactionTable() {
  const { transactions, total, totalPages, page, isLoading, updateFilter, mutate } = useTransactionContext()

  const handleUpdateCategory = useCallback(async (id: string, categoryId: string) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId }),
    })
    if (!res.ok) throw new Error('Failed to update')
    mutate()
  }, [mutate])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    if (res.ok) mutate()
  }, [mutate])

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="font-medium">No transactions found</p>
        <p className="text-sm mt-1">Upload an Excel file to get started</p>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Description</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Category</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Balance</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">By</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx: TransactionWithCategory) => (
              <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                <td className="px-4 py-3 text-slate-900 max-w-xs truncate" title={tx.originalDescription}>
                  {tx.originalDescription}
                  {tx.manuallyOverridden && (
                    <span className="ml-2 text-xs text-blue-500">edited</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <CategorySelect transaction={tx} onUpdate={handleUpdateCategory} />
                </td>
                <td className={`px-4 py-3 text-right font-mono font-medium whitespace-nowrap ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatAmount(tx.amount)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-600 whitespace-nowrap">
                  {tx.balance != null ? tx.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    tx.classifiedBy === 'claude' ? 'bg-purple-50 text-purple-600' :
                    tx.classifiedBy === 'user' ? 'bg-blue-50 text-blue-600' :
                    'bg-slate-100 text-slate-400'
                  }`}>
                    {tx.classifiedBy}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
        <p className="text-sm text-slate-500">
          {total} transactions total
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateFilter('page', (page ?? 1) - 1)}
            disabled={(page ?? 1) <= 1}
            className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => updateFilter('page', (page ?? 1) + 1)}
            disabled={(page ?? 1) >= totalPages}
            className="px-3 py-1 text-sm border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
