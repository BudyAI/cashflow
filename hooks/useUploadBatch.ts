'use client'
import { useState, useEffect, useRef } from 'react'
import type { UploadBatchStatus, FilePreview, ColumnMapping } from '@/types'

export type UploadStep = 'idle' | 'previewing' | 'mapping' | 'uploading'

export function useUploadBatch() {
  const [step, setStep] = useState<UploadStep>('idle')
  const [preview, setPreview] = useState<FilePreview | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [status, setStatus] = useState<UploadBatchStatus | null>(null)
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

  async function previewFile(file: File): Promise<void> {
    setStep('previewing')
    setCurrentFile(file)

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload/preview', { method: 'POST', body: formData })
    if (!res.ok) {
      const err = await res.json()
      setStep('idle')
      throw new Error(err.error ?? 'Failed to read file')
    }

    const data = await res.json()
    setPreview(data)
    setStep('mapping')
  }

  async function uploadFileWithMapping(mapping: ColumnMapping): Promise<void> {
    if (!currentFile) return
    setStep('uploading')
    setBatchId(null)
    setStatus(null)

    const formData = new FormData()
    formData.append('file', currentFile)
    formData.append('columnMapping', JSON.stringify(mapping))

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) {
      const err = await res.json()
      setStep('mapping')
      throw new Error(err.error ?? 'Upload failed')
    }

    const data = await res.json()
    setBatchId(data.batchId)
    setStatus({ id: data.batchId, status: 'processing', totalRows: data.totalRows, processedRows: 0, errors: [] })
  }

  function reset() {
    setStep('idle')
    setPreview(null)
    setCurrentFile(null)
    setBatchId(null)
    setStatus(null)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const progress = status && status.totalRows > 0
    ? Math.round((status.processedRows / status.totalRows) * 100)
    : 0

  const isUploading = step === 'uploading'

  return { step, preview, currentFile, previewFile, uploadFileWithMapping, reset, isUploading, status, progress, batchId }
}
