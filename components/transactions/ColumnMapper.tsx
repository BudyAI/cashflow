'use client'
import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import type { FilePreview, ColumnMapping } from '@/types'

interface Props {
  preview: FilePreview
  fileName: string
  onConfirm: (mapping: ColumnMapping) => void
  onCancel: () => void
}

export function ColumnMapper({ preview, fileName, onConfirm, onCancel }: Props) {
  const { headers, sampleRows, suggestedMapping } = preview

  const [date, setDate] = useState(suggestedMapping.date ?? '')
  const [description, setDescription] = useState(suggestedMapping.description ?? '')
  const [amountMode, setAmountMode] = useState<'single' | 'debitcredit'>(suggestedMapping.amountMode)
  const [amount, setAmount] = useState(suggestedMapping.amount ?? '')
  const [debit, setDebit] = useState(suggestedMapping.debit ?? '')
  const [credit, setCredit] = useState(suggestedMapping.credit ?? '')
  const [balance, setBalance] = useState(suggestedMapping.balance ?? '')

  const isValid =
    date &&
    description &&
    (amountMode === 'single' ? !!amount : !!debit && !!credit)

  const handleConfirm = () => {
    if (!isValid) return
    onConfirm({
      date,
      description,
      amountMode,
      amount: amountMode === 'single' ? amount : undefined,
      debit: amountMode === 'debitcredit' ? debit : undefined,
      credit: amountMode === 'debitcredit' ? credit : undefined,
      balance: balance || undefined,
    })
  }

  // Build preview rows using current mapping
  const previewRows = sampleRows.slice(0, 4).map(row => {
    const get = (col: string) => {
      const idx = headers.indexOf(col)
      return idx !== -1 ? (row[idx] ?? '') : ''
    }

    let amountDisplay = ''
    if (amountMode === 'single' && amount) {
      amountDisplay = get(amount)
    } else if (amountMode === 'debitcredit') {
      const d = debit ? get(debit) : ''
      const c = credit ? get(credit) : ''
      const dNum = parseFloat(d.replace(/[^0-9.-]/g, ''))
      const cNum = parseFloat(c.replace(/[^0-9.-]/g, ''))
      if (!isNaN(dNum) && dNum !== 0) amountDisplay = `-${d}`
      else if (!isNaN(cNum) && cNum !== 0) amountDisplay = `+${c}`
      else if (d) amountDisplay = d
      else if (c) amountDisplay = c
    }

    return {
      date: date ? get(date) : '',
      description: description ? get(description) : '',
      amount: amountDisplay,
      balance: balance ? get(balance) : '',
    }
  }).filter(r => r.date || r.description)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Map Your Columns</h3>
          <p className="text-sm text-slate-500 mt-0.5 truncate max-w-[240px]">{fileName}</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mapping fields */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Required</p>

        <MappingRow label="Date" required value={date} onChange={setDate} headers={headers} />
        <MappingRow label="Description" required value={description} onChange={setDescription} headers={headers} />

        {/* Amount type toggle */}
        <div className="flex items-center gap-4">
          <span className="w-32 text-sm font-medium text-slate-600 flex-shrink-0">Amount type</span>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={amountMode === 'single'}
                onChange={() => setAmountMode('single')}
                className="accent-blue-500"
              />
              Single column
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={amountMode === 'debitcredit'}
                onChange={() => setAmountMode('debitcredit')}
                className="accent-blue-500"
              />
              Debit + Credit
            </label>
          </div>
        </div>

        {amountMode === 'single' ? (
          <MappingRow label="Amount" required value={amount} onChange={setAmount} headers={headers} />
        ) : (
          <>
            <MappingRow label="Debit column" required value={debit} onChange={setDebit} headers={headers} />
            <MappingRow label="Credit column" required value={credit} onChange={setCredit} headers={headers} />
          </>
        )}

        <div className="pt-2 border-t border-slate-100 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Optional</p>
          <MappingRow label="Balance" value={balance} onChange={setBalance} headers={headers} allowNone />
        </div>
      </div>

      {/* Preview table */}
      {previewRows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-2">
            Preview ({previewRows.length} rows)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-100">
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-500">Description</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-500">Amount</th>
                  {balance && <th className="text-right px-4 py-2 font-medium text-slate-500">Balance</th>}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{row.date || '—'}</td>
                    <td className="px-4 py-2 text-slate-700 max-w-[180px] truncate">{row.description || '—'}</td>
                    <td className={`px-4 py-2 text-right font-mono whitespace-nowrap ${
                      row.amount.startsWith('-') ? 'text-red-600' :
                      row.amount.startsWith('+') ? 'text-green-600' : 'text-slate-700'
                    }`}>{row.amount || '—'}</td>
                    {balance && (
                      <td className="px-4 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{row.balance || '—'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Change file
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isValid}
          className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          Import
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function MappingRow({
  label,
  value,
  onChange,
  headers,
  required = false,
  allowNone = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  headers: string[]
  required?: boolean
  allowNone?: boolean
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="w-32 text-sm font-medium text-slate-600 flex-shrink-0">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`flex-1 border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
          required && !value ? 'border-red-300 bg-red-50' : 'border-slate-200'
        }`}
      >
        <option value="">{allowNone ? '— none —' : '— select column —'}</option>
        {headers.map((h: string) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
    </div>
  )
}
