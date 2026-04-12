'use client'
import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import type { AgingColumnMapping, AgingFilePreview } from '@/types'

interface Props {
  preview: AgingFilePreview
  fileName: string
  onConfirm: (mapping: AgingColumnMapping) => void
  onCancel: () => void
}

export function AgingColumnMapper({ preview, fileName, onConfirm, onCancel }: Props) {
  const { headers, sampleRows, suggestedMapping } = preview

  const [dueDate, setDueDate] = useState(suggestedMapping.dueDate ?? '')
  const [amount, setAmount] = useState(suggestedMapping.amount ?? '')
  const [currency, setCurrency] = useState(suggestedMapping.currency ?? '')
  const [customer, setCustomer] = useState(suggestedMapping.customer ?? '')
  const [contactName, setContactName] = useState(suggestedMapping.contactName ?? '')
  const [issueDate, setIssueDate] = useState(suggestedMapping.issueDate ?? '')
  const [invoiceNumber, setInvoiceNumber] = useState(suggestedMapping.invoiceNumber ?? '')

  const isValid = !!dueDate && !!amount

  const handleConfirm = () => {
    if (!isValid) return
    onConfirm({
      dueDate,
      amount,
      currency: currency || undefined,
      customer: customer || undefined,
      contactName: contactName || undefined,
      issueDate: issueDate || undefined,
      invoiceNumber: invoiceNumber || undefined,
    })
  }

  // Build preview rows from current mapping
  const previewRows = sampleRows.slice(0, 4).map(row => {
    const get = (col: string) => {
      const idx = headers.indexOf(col)
      return idx !== -1 ? String(row[idx] ?? '') : ''
    }
    return {
      customer: customer ? get(customer) : '',
      invoiceNumber: invoiceNumber ? get(invoiceNumber) : '',
      issueDate: issueDate ? get(issueDate) : '',
      dueDate: dueDate ? get(dueDate) : '',
      amount: amount ? get(amount) : '',
      currency: currency ? get(currency) : '',
    }
  }).filter(r => r.dueDate || r.amount)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Map Aging Report Columns</h3>
          <p className="text-sm text-slate-500 mt-0.5 truncate max-w-[280px]">{fileName}</p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mapping fields */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Required</p>
        <MappingRow label="Due Date"       required value={dueDate}       onChange={setDueDate}       headers={headers} />
        <MappingRow label="Amount"         required value={amount}         onChange={setAmount}         headers={headers} />

        <div className="pt-2 border-t border-slate-100 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Optional</p>
          <div className="space-y-1">
            <MappingRow label="Currency" value={currency} onChange={setCurrency} headers={headers} allowNone />
            <p className="text-xs text-slate-500 max-w-xl ml-40">
              Optional. If not mapped, the report is stored as <span className="font-medium text-slate-700">USD</span>.
              Map only if the file has a currency column (USD / ILS). Use a single currency per file for a clean report.
            </p>
          </div>
          <MappingRow label="Customer"       value={customer}       onChange={setCustomer}       headers={headers} allowNone />
          <MappingRow label="Contact Name"   value={contactName}    onChange={setContactName}    headers={headers} allowNone />
          <MappingRow label="Issue Date"     value={issueDate}      onChange={setIssueDate}      headers={headers} allowNone />
          <MappingRow label="Invoice Number" value={invoiceNumber}  onChange={setInvoiceNumber}  headers={headers} allowNone />
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
                  {customer      && <th className="text-left px-3 py-2 font-medium text-slate-500">Customer</th>}
                  {invoiceNumber && <th className="text-left px-3 py-2 font-medium text-slate-500">Invoice #</th>}
                  {issueDate     && <th className="text-left px-3 py-2 font-medium text-slate-500">Issue Date</th>}
                  <th className="text-left px-3 py-2 font-medium text-slate-500">Due Date</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-500">Amount</th>
                  {currency      && <th className="text-left px-3 py-2 font-medium text-slate-500">Currency</th>}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    {customer      && <td className="px-3 py-2 text-slate-700 max-w-[120px] truncate">{row.customer || '—'}</td>}
                    {invoiceNumber && <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.invoiceNumber || '—'}</td>}
                    {issueDate     && <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.issueDate || '—'}</td>}
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.dueDate || '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700 whitespace-nowrap">{row.amount || '—'}</td>
                    {currency      && <td className="px-3 py-2 text-slate-500">{row.currency || '—'}</td>}
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
  label, value, onChange, headers, required = false, allowNone = false,
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
      <label className="w-36 text-sm font-medium text-slate-600 flex-shrink-0">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`flex-1 border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
          required && !value ? 'border-red-300 bg-red-50' : 'border-slate-200'
        }`}
      >
        <option value="">{allowNone ? '— none —' : '— select column —'}</option>
        {headers.map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
    </div>
  )
}
