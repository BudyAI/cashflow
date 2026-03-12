'use client'
import { createContext, useContext } from 'react'
import type { CashflowSummary } from '@/types'

interface CashflowContextValue {
  summary: CashflowSummary | undefined
  isLoading: boolean
  error: unknown
  dateFrom: string
  dateTo: string
  setDateFrom: (v: string) => void
  setDateTo: (v: string) => void
}

export const CashflowContext = createContext<CashflowContextValue | null>(null)

export function useCashflowContext() {
  const ctx = useContext(CashflowContext)
  if (!ctx) throw new Error('useCashflowContext must be used within CashflowProvider')
  return ctx
}
