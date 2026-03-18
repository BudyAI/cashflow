'use client'
import { ReactNode } from 'react'
import { TransactionContext } from './TransactionContext'
import { useTransactions } from '@/hooks/useTransactions'

export function TransactionProvider({ children }: { children: ReactNode }) {
  const value = useTransactions()
  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  )
}
