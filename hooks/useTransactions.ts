'use client'
import useSWR from 'swr'
import { useState } from 'react'
import type { TransactionFilters, TransactionWithCategory } from '@/types'

interface TransactionsResponse {
  transactions: TransactionWithCategory[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const fetcher = (url: string) => fetch(url).then(r => r.json())

function buildUrl(filters: TransactionFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.categoryId) params.set('categoryId', filters.categoryId)
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.set('dateTo', filters.dateTo)
  if (filters.type) params.set('type', filters.type)
  if (filters.page) params.set('page', String(filters.page))
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize))
  return `/api/transactions?${params.toString()}`
}

export function useTransactions(initialFilters: TransactionFilters = {}) {
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    pageSize: 50,
    ...initialFilters,
  })

  const { data, error, isLoading, mutate } = useSWR<TransactionsResponse>(
    buildUrl(filters),
    fetcher,
    { keepPreviousData: true }
  )

  function updateFilter(key: keyof TransactionFilters, value: string | number | undefined) {
    setFilters(prev => ({ ...prev, [key]: value, page: key === 'page' ? (value as number) : 1 }))
  }

  return {
    transactions: data?.transactions ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
    page: filters.page ?? 1,
    isLoading,
    error,
    filters,
    updateFilter,
    mutate,
  }
}
