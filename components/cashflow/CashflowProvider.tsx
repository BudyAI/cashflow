'use client'
import { ReactNode } from 'react'
import { CashflowContext } from './CashflowContext'
import { useCashflow } from '@/hooks/useCashflow'

export function CashflowProvider({ children }: { children: ReactNode }) {
  const value = useCashflow()
  return (
    <CashflowContext.Provider value={value}>
      {children}
    </CashflowContext.Provider>
  )
}
