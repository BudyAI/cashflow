'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { useUploadBatch } from '@/hooks/useUploadBatch'
import { ClassifyProgress } from './ClassifyProgress'

export function UploadZone() {
  const { uploadFile, isUploading, status, progress } = useUploadBatch()
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setError(null)
    try {
      await uploadFile(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [uploadFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isUploading || status?.status === 'processing',
  })

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 hover:border-slate-300 bg-white'
        } ${(isUploading || status?.status === 'processing') ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
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
              {isUploading ? 'Uploading...' : isDragActive ? 'Drop your Excel file here' : 'Upload Excel file'}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              Drag & drop or click to select — .xlsx or .xls
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {status && <ClassifyProgress status={status} progress={progress} />}
    </div>
  )
}
