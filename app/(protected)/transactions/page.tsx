'use client'
import dynamic from 'next/dynamic'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { TransactionProvider } from '@/components/transactions/TransactionProvider'
import { BatchHistoryInner } from '@/components/transactions/BatchHistory'

const UploadZone = dynamic(() => import('@/components/transactions/UploadZone').then(m => m.UploadZone), {
  ssr: false,
  loading: () => <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 bg-white animate-pulse h-32" />,
})

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
        <p className="text-slate-500 mt-1">Upload and manage your financial transactions</p>
      </div>
      <UploadZone />
      <TransactionProvider>
        <BatchHistoryInner />
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <TransactionFilters />
          <TransactionTable />
        </div>
      </TransactionProvider>
    </div>
  )
}
