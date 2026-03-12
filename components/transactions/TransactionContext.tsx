'use client'
import { createContext, useContext } from 'react'
import type { TransactionFilters, TransactionWithCategory } from '@/types'

interface TransactionContextValue {
  transactions: TransactionWithCategory[]
  total: number
  totalPages: number
  page: number
  isLoading: boolean
  filters: TransactionFilters
  updateFilter: (key: keyof TransactionFilters, value: string | number | undefined) => void
  mutate: () => void
}

export const TransactionContext = createContext<TransactionContextValue | null>(null)

export function useTransactionContext() {
  const ctx = useContext(TransactionContext)
  if (!ctx) throw new Error('useTransactionContext must be used within TransactionProvider')
  return ctx
}
