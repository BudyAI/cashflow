'use client'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { UploadBatchStatus } from '@/types'

interface ClassifyProgressProps {
  status: UploadBatchStatus
  progress: number
}

export function ClassifyProgress({ status, progress }: ClassifyProgressProps) {
  if (status.status === 'complete') {
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span>
          Classification complete — {status.processedRows} transactions processed
          {status.errors.length > 0 && ` (${status.errors.length} parse errors)`}
        </span>
      </div>
    )
  }

  if (status.status === 'failed') {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
        <XCircle className="w-4 h-4 flex-shrink-0" />
        Classification failed
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          Classifying transactions with AI...
        </div>
        <span className="text-slate-500">
          {status.processedRows} / {status.totalRows}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
