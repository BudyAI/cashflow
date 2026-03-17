'use client'
import { useCallback, useState } from 'react'
import { mutate } from 'swr'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { AgingColumnMapper } from './AgingColumnMapper'
import type { AgingColumnMapping, AgingFilePreview } from '@/types'

type Step = 'idle' | 'previewing' | 'mapping' | 'uploading'

interface AgingUploadZoneProps {
  asOf: string
}

export function AgingUploadZone({ asOf }: AgingUploadZoneProps) {
  const [step, setStep] = useState<Step>('idle')
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<AgingFilePreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const previewFile = useCallback(async (file: File) => {
    setStep('previewing')
    setCurrentFile(file)
    setError(null)
    setSuccess(false)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/aging/preview', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to read file')
      setPreview(json)
      setStep('mapping')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
      setStep('idle')
    }
  }, [])

  const handleConfirm = useCallback(async (mapping: AgingColumnMapping) => {
    if (!currentFile) return
    setStep('uploading')
    setError(null)
    setWarning(null)
    try {
      const fd = new FormData()
      fd.append('file', currentFile)
      fd.append('columnMapping', JSON.stringify(mapping))
      fd.append('reportDate', asOf)
      const res = await fetch('/api/aging', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Upload failed')
        setStep('mapping')
      } else {
        if (json.warnings?.length) setWarning(json.warnings.join(' '))
        setSuccess(true)
        setStep('idle')
        setPreview(null)
        setCurrentFile(null)
        await mutate('/api/aging')
      }
    } catch {
      setError('Upload failed')
      setStep('mapping')
    }
  }, [currentFile, asOf])

  const handleCancel = () => {
    setStep('idle')
    setPreview(null)
    setCurrentFile(null)
    setError(null)
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) previewFile(file)
  }, [previewFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: step !== 'idle',
  })

  // Column mapping step — show mapper instead of drop zone
  if (step === 'mapping' && preview) {
    return (
      <div className="space-y-3">
        <AgingColumnMapper
          preview={preview}
          fileName={currentFile?.name ?? ''}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
        {error && <ErrorBar message={error} />}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors min-h-[160px] flex items-center justify-center ${
          step !== 'idle'
            ? 'opacity-60 cursor-not-allowed border-slate-200 bg-white'
            : isDragActive
              ? 'border-purple-400 bg-purple-50 cursor-copy'
              : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {step === 'previewing' || step === 'uploading' ? (
            <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          ) : success ? (
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              {isDragActive
                ? <FileSpreadsheet className="w-6 h-6 text-purple-500" />
                : <Upload className="w-6 h-6 text-slate-400" />}
            </div>
          )}
          <div>
            <p className="font-medium text-slate-700">
              {step === 'previewing' ? 'Reading file…'
                : step === 'uploading' ? 'Uploading…'
                : success ? 'Aging report uploaded'
                : isDragActive ? 'Drop aging report here'
                : 'Upload Aging Report'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {success ? 'Drop another file to update' : 'Drag & drop or click — .xlsx or .xls'}
            </p>
            {step === 'idle' && !success && (
              <p className="text-xs text-slate-300 mt-1">
                Expected columns: Due Date, Amount (aging calculated automatically)
              </p>
            )}
          </div>
        </div>
      </div>

      {error && <ErrorBar message={error} />}
      {warning && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {warning}
        </div>
      )}
    </div>
  )
}

function ErrorBar({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      {message}
    </div>
  )
}
