import * as XLSX from 'xlsx'
import type { AgingColumnMapping, Currency } from '@/types'
import { normalizeCurrency } from '@/lib/currency'

export interface AgingTotals {
  current: number
  days1to30: number
  days31to60: number
  days61to90: number
  days90plus: number
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0
  const n = Number(String(val).replace(/[,$\s()]/g, ''))
  return isNaN(n) ? 0 : Math.abs(n)
}

function parseDate(val: unknown): Date | null {
  if (val === null || val === undefined || val === '') return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val)
    if (d) return new Date(d.y, d.m - 1, d.d)
    return null
  }
  const s = String(val).trim()
  if (!s) return null
  // DD/MM/YYYY and variants
  const dmyMatch = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y)
    const date = new Date(year, parseInt(m) - 1, parseInt(d))
    if (!isNaN(date.getTime())) return date
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function assignBucket(dueDate: Date, asOf: Date): keyof AgingTotals {
  const overdue = daysBetween(dueDate, asOf)
  if (overdue <= 0) return 'current'
  if (overdue <= 30) return 'days1to30'
  if (overdue <= 60) return 'days31to60'
  if (overdue <= 90) return 'days61to90'
  return 'days90plus'
}

export function parseAgingExcel(
  buffer: Buffer,
  mapping: AgingColumnMapping,
  asOf: Date = new Date()
): { totals: AgingTotals; errors: string[]; currency: Currency } {
  const errors: string[] = []
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  // Find header row by locating the row that contains the mapped column names
  let headerRowIdx = -1
  let colIndex: Record<string, number> = {}

  for (let r = 0; r < Math.min(rows.length, 20); r++) {
    const row = rows[r] as unknown[]
    const idx: Record<string, number> = {}
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').trim()
      if (cell === mapping.dueDate) idx.dueDate = c
      if (cell === mapping.amount) idx.amount = c
      if (mapping.currency && cell === mapping.currency) idx.currency = c
      if (mapping.customer && cell === mapping.customer) idx.customer = c
      if (mapping.contactName && cell === mapping.contactName) idx.contactName = c
      if (mapping.issueDate && cell === mapping.issueDate) idx.issueDate = c
      if (mapping.invoiceNumber && cell === mapping.invoiceNumber) idx.invoiceNumber = c
    }
    if (idx.dueDate !== undefined && idx.amount !== undefined) {
      headerRowIdx = r
      colIndex = idx
      break
    }
  }

  if (headerRowIdx === -1) {
    throw new Error(
      `Could not find columns "${mapping.dueDate}" and "${mapping.amount}" in the file. ` +
      'Please check your column mapping.'
    )
  }

  const totals: AgingTotals = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, days90plus: 0 }
  let rowsProcessed = 0
  let skippedNoDueDate = 0
  let skippedNoAmount = 0

  let reportCurrency: Currency = 'USD'
  let firstMappedCurrency: Currency | null = null
  let sawMixedCurrency = false
  const currencyCol = mapping.currency ? colIndex.currency : undefined

  const asOfDay = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] as unknown[]
    const rowText = row.map(c => String(c ?? '').trim()).join('')
    if (!rowText) continue

    const firstCell = String(row[0] ?? '').toLowerCase()
    if (firstCell.includes('total') || firstCell.includes('grand') || firstCell.includes('subtotal')) continue

    const dueDate = parseDate(row[colIndex.dueDate])
    const amount = toNumber(row[colIndex.amount])

    if (!dueDate) { skippedNoDueDate++; continue }
    if (amount === 0) { skippedNoAmount++; continue }

    if (currencyCol !== undefined) {
      const raw = String(row[currencyCol] ?? '').trim()
      if (raw) {
        const c = normalizeCurrency(raw)
        if (firstMappedCurrency === null) firstMappedCurrency = c
        else if (firstMappedCurrency !== c) sawMixedCurrency = true
      }
    }

    const bucket = assignBucket(dueDate, asOfDay)
    totals[bucket] += amount
    rowsProcessed++
  }

  if (rowsProcessed === 0) {
    throw new Error('No valid rows with a due date and amount were found in this file.')
  }
  if (skippedNoDueDate > 0) errors.push(`${skippedNoDueDate} row(s) skipped — no parseable due date.`)
  if (skippedNoAmount > 0) errors.push(`${skippedNoAmount} row(s) skipped — zero or missing amount.`)

  if (firstMappedCurrency !== null) reportCurrency = firstMappedCurrency
  if (sawMixedCurrency) {
    errors.push(
      'Mixed USD/ILS values in the currency column; stored report currency follows the first non-empty row.'
    )
  }

  return { totals, errors, currency: reportCurrency }
}
