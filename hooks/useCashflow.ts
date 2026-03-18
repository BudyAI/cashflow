'use client'
import useSWR from 'swr'
import { useState } from 'react'
import type { CashflowSummary } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export type Currency = 'USD' | 'ILS'

export function useCashflow() {
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [currency, setCurrency] = useState<Currency>('USD')

  const params = new URLSearchParams()
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)

  const { data, error, isLoading } = useSWR<CashflowSummary>(
    `/api/cashflow?${params.toString()}`,
    fetcher
  )

  return {
    summary: data,
    isLoading,
    error,
    dateFrom,
    dateTo,
    setDateFrom,
    setDateTo,
    currency,
    setCurrency,
  }
}
