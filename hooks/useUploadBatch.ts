'use client'
import { useState, useEffect, useRef } from 'react'
import type { UploadBatchStatus } from '@/types'

export function useUploadBatch() {
  const [batchId, setBatchId] = useState<string | null>(null)
  const [status, setStatus] = useState<UploadBatchStatus | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!batchId || status?.status === 'complete' || status?.status === 'failed') {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/upload/${batchId}/status`)
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
        }
      } catch {
        // ignore
      }
    }, 2000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [batchId, status?.status])

  async function uploadFile(file: File): Promise<void> {
    setIsUploading(true)
    setStatus(null)
    setBatchId(null)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json()
      setIsUploading(false)
      throw new Error(err.error ?? 'Upload failed')
    }

    const data = await res.json()
    setBatchId(data.batchId)
    setStatus({ id: data.batchId, status: 'processing', totalRows: data.totalRows, processedRows: 0, errors: [] })
    setIsUploading(false)
  }

  const progress = status && status.totalRows > 0
    ? Math.round((status.processedRows / status.totalRows) * 100)
    : 0

  return { uploadFile, isUploading, status, progress, batchId }
}
