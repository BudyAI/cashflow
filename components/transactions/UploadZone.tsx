'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { useUploadBatch } from '@/hooks/useUploadBatch'
import { ClassifyProgress } from './ClassifyProgress'
import { ColumnMapper } from './ColumnMapper'
import type { ColumnMapping } from '@/types'

export function UploadZone() {
  const { step, preview, currentFile, previewFile, uploadFileWithMapping, reset, status, progress } = useUploadBatch()
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setError(null)
    try {
      await previewFile(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
    }
  }, [previewFile])

  const handleConfirm = async (mapping: ColumnMapping) => {
    setError(null)
    try {
      await uploadFileWithMapping(mapping)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const handleCancel = () => {
    setError(null)
    reset()
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/html': ['.html', '.htm'],
    },
    maxFiles: 1,
    disabled: step !== 'idle',
  })

  // Column mapping step — replace drop zone entirely
  if (step === 'mapping' && preview) {
    return (
      <div className="space-y-3">
        <ColumnMapper
          preview={preview}
          fileName={currentFile?.name ?? ''}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
        {error && <ErrorBar message={error} />}
      </div>
    )
  }

  const isDisabled = step !== 'idle'

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors min-h-[160px] flex items-center justify-center ${
          isDisabled
            ? 'opacity-60 cursor-not-allowed border-slate-200 bg-white'
            : isDragActive
              ? 'border-blue-400 bg-blue-50 cursor-copy'
              : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {step === 'previewing' || step === 'uploading' ? (
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
              {isDragActive ? (
                <FileSpreadsheet className="w-6 h-6 text-blue-500" />
              ) : (
                <Upload className="w-6 h-6 text-slate-400" />
              )}
            </div>
          )}
          <div>
            <p className="font-medium text-slate-700">
              {step === 'previewing'
                ? 'Reading file…'
                : step === 'uploading'
                  ? 'Uploading…'
                  : isDragActive
                    ? 'Drop your Excel file here'
                    : 'Upload Excel file'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Drag & drop or click to select — .xlsx or .xls
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Expected columns: Date, Description, Amount (or Debit / Credit)
            </p>
          </div>
        </div>
      </div>

      {error && <ErrorBar message={error} />}

      {status && <ClassifyProgress status={status} progress={progress} />}
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
