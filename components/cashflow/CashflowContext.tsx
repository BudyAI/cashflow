'use client'
import { createContext, useContext } from 'react'
import type { CashflowSummary } from '@/types'
import type { Currency } from '@/hooks/useCashflow'

export type { Currency }

interface CashflowContextValue {
  summary: CashflowSummary | undefined
  isLoading: boolean
  error: unknown
  dateFrom: string
  dateTo: string
  setDateFrom: (v: string) => void
  setDateTo: (v: string) => void
  currency: Currency
  setCurrency: (v: Currency) => void
}

export const CashflowContext = createContext<CashflowContextValue | null>(null)

export function useCashflowContext() {
  const ctx = useContext(CashflowContext)
  if (!ctx) throw new Error('useCashflowContext must be used within CashflowProvider')
  return ctx
}

export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === 'ILS' ? 'he-IL' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatK(value: number, currency: Currency): string {
  const symbol = currency === 'ILS' ? '₪' : '$'
  if (Math.abs(value) >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1000) return `${symbol}${(value / 1000).toFixed(1)}k`
  return `${symbol}${value.toFixed(0)}`
}
