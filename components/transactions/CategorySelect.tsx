'use client'
import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import type { TransactionWithCategory } from '@/types'

interface CategorySelectProps {
  transaction: TransactionWithCategory
  onUpdate: (id: string, categoryId: string) => Promise<void>
}

export function CategorySelect({ transaction, onUpdate }: CategorySelectProps) {
  const { categories } = useCategories()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const categoryId = e.target.value
    if (!categoryId || categoryId === transaction.categoryId) return
    setLoading(true)
    setErrorMessage(null)
    try {
      await onUpdate(transaction.id, categoryId)
    } catch {
      setErrorMessage('Update failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const current = transaction.category

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${current ? '' : 'invisible'}`}
          style={current ? { backgroundColor: current.color } : undefined}
          aria-hidden="true"
        />
        <select
          value={transaction.categoryId ?? ''}
          onChange={handleChange}
          disabled={loading}
          className={`text-sm border border-transparent rounded px-1 py-0.5 focus:outline-none focus:border-slate-300 hover:border-slate-200 bg-transparent ${loading ? 'opacity-50' : ''}`}
        >
          <option value="">Uncategorized</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {errorMessage && (
        <p className="text-[11px] font-medium text-red-600">{errorMessage}</p>
      )}
    </div>
  )
}
