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

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const categoryId = e.target.value
    if (!categoryId || categoryId === transaction.categoryId) return
    setLoading(true)
    try {
      await onUpdate(transaction.id, categoryId)
    } finally {
      setLoading(false)
    }
  }

  const current = transaction.category

  return (
    <div className="flex items-center gap-2">
      {current && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: current.color }}
        />
      )}
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
  )
}
