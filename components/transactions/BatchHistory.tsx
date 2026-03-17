'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { Trash2, CheckCircle, Loader2, XCircle } from 'lucide-react'
import type { UploadBatch } from '@/types'
import { useTransactionContext } from './TransactionContext'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function BatchHistoryList({ onDeleted }: { onDeleted: () => void }) {
  const { data: batches, mutate: mutateBatches } = useSWR<UploadBatch[]>('/api/upload', fetcher, {
    refreshInterval: (data) => data?.some(b => b.status === 'processing') ? 3000 : 0,
  })
  const [deleting, setDeleting] = useState<string | null>(null)

  if (!batches || batches.length === 0) return null

  async function handleDelete(batchId: string, totalRows: number) {
    if (!confirm(`Delete all ${totalRows} transactions from this upload?`)) return
    setDeleting(batchId)
    try {
      const res = await fetch(`/api/upload/${batchId}`, { method: 'DELETE' })
      if (res.ok) {
        await mutateBatches()
        onDeleted()
      }
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">Upload History</h2>
      </div>
      <ul className="divide-y divide-slate-50">
        {batches.map(batch => (
          <li key={batch.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
            <div className="flex items-center gap-3">
              {batch.status === 'complete' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
              {batch.status === 'processing' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
              {batch.status === 'failed' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
              <div>
                <p className="text-sm text-slate-800">
                  {batch.totalRows} transactions
                  {batch.status === 'processing' && (
                    <span className="ml-2 text-xs text-blue-500">
                      ({batch.processedRows} classified)
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">{formatDate(batch.createdAt)}</p>
              </div>
            </div>
            <button
              onClick={() => handleDelete(batch.id, batch.totalRows)}
              disabled={deleting === batch.id}
              className="text-slate-300 hover:text-red-500 transition-colors disabled:opacity-40"
              title="Delete all transactions in this upload"
            >
              {deleting === batch.id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Trash2 className="w-4 h-4" />
              }
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Used inside TransactionProvider so it can trigger a table refresh after delete
export function BatchHistoryInner() {
  const { mutate } = useTransactionContext()
  return <BatchHistoryList onDeleted={mutate} />
}
