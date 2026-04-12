'use client'
import dynamic from 'next/dynamic'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { TransactionProvider } from '@/components/transactions/TransactionProvider'
import { BatchHistoryInner } from '@/components/transactions/BatchHistory'
const UploadZone = dynamic(() => import('@/components/transactions/UploadZone').then(m => m.UploadZone), {
  ssr: false,
  loading: () => <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 bg-white animate-pulse min-h-[160px]" />,
})

const AgingUploadZone = dynamic(() => import('@/components/transactions/AgingUploadZone').then(m => m.AgingUploadZone), {
  ssr: false,
  loading: () => <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 bg-white animate-pulse min-h-[160px]" />,
})

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
        <p className="text-slate-500 mt-1">Upload and manage your financial transactions</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-600">Bank Transactions</p>
          <UploadZone />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-600">Aging Report</p>
          <AgingUploadZone />
        </div>
      </div>
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
