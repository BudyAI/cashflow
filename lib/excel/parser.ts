import * as XLSX from 'xlsx'
import type { ParsedTransaction, ParseResult, ColumnMapping, FilePreview } from '@/types'
import { normalizeCurrency } from '@/lib/currency'

function parseDate(raw: string): Date | null {
  // Handle D/M/YY, D/M/YYYY, DD/MM/YY, DD/MM/YYYY (Israeli/European format)
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (slashMatch) {
    const [, a, b, y] = slashMatch
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y)
    // If first part > 12, it must be DD/MM
    // If second part > 12, it must be MM/DD
    // Default assumption for Israeli bank: DD/MM/YYYY
    const day = parseInt(a)
    const month = parseInt(b)
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    const d = new Date(year, month - 1, day)
    if (isNaN(d.getTime())) return null
    return d
  }
  // Handle D-M-YYYY or YYYY-MM-DD (ISO)
  const d = new Date(raw)
  if (!isNaN(d.getTime())) return d
  return null
}

function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const str = String(value).trim()
  if (str === '' || str === '&nbsp;') return null
  const isNegative = str.startsWith('(') && str.endsWith(')')
  const cleaned = str.replace(/[()$£€,\s]/g, '')
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  return isNegative ? -Math.abs(num) : num
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/[\s_\-]/g, '')
}

function findColumn(headers: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = headers.findIndex((h: string) => normalizeColumnName(h) === candidate)
    if (idx !== -1) return idx
  }
  // Partial match fallback
  for (const candidate of candidates) {
    const idx = headers.findIndex((h: string) => normalizeColumnName(h).includes(candidate))
    if (idx !== -1) return idx
  }
  return -1
}

function extractHtmlTable(html: string): string[][] {
  const rows: string[][] = []
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch: RegExpExecArray | null
  while ((trMatch = trRegex.exec(html)) !== null) {
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
    const cells: string[] = []
    let cellMatch: RegExpExecArray | null
    while ((cellMatch = cellRegex.exec(trMatch[1])) !== null) {
      const text = cellMatch[1]
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#171;/g, '')
        .replace(/&#187;/g, '')
        .trim()
      cells.push(text)
    }
    if (cells.some(c => c !== '')) rows.push(cells)
  }
  return rows
}

/** Extract raw string rows from any supported file format */
export function extractRawRows(buffer: Buffer): string[][] | { error: string } {
  const content = buffer.toString('utf8')

  // Detect HTML file (bank export)
  if (content.trimStart().startsWith('<') || content.includes('<html') || content.includes('<table')) {
    // Check if it's a frameset (wrapper XLS) — actual data is in _files/sheet001.htm
    if (content.includes('frSheet') || content.includes('frameset') || content.includes('HRef=')) {
      return {
        error:
          'This file is a multi-file bank export. Please upload the actual data file instead: ' +
          'open the folder named "' +
          'דו_ח תנועות בחשבון (9)_files' +
          '" (same name as your XLS file but with _files suffix) and upload "sheet001.htm" from inside it.',
      }
    }
    const rows = extractHtmlTable(content)
    if (rows.length < 2) return { error: 'HTML file appears to have no table data' }
    return rows
  }

  // Standard Excel file (xlsx/xls/csv)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { error: 'No sheets found in the file' }

  const sheet = workbook.Sheets[sheetName]
  const allRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    dateNF: 'yyyy-mm-dd',
    defval: '',
  })

  const rows = allRows
    .map(r => (r as unknown[]).map(v => String(v ?? '').trim()))
    .filter(row => row.some(cell => cell !== ''))

  if (rows.length < 2) {
    return { error: `File appears to be empty (found ${rows.length} non-empty rows in sheet "${sheetName}")` }
  }

  return rows
}

/** Find the header row index using keyword detection, falling back to first non-empty row */
export function findHeaderRowIndex(rows: string[][]): number {
  // Try strict detection: row with date + amount/debit/credit keywords
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const normalized = rows[i].map(normalizeColumnName)
    if (
      normalized.some((h: string) => h === 'date' || h.includes('date')) &&
      normalized.some((h: string) => h === 'debit' || h === 'credit' || h === 'amount' || h.includes('amount'))
    ) {
      return i
    }
  }
  // Fallback: first non-empty row
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (rows[i].some(cell => cell !== '')) return i
  }
  return -1
}

/** Build suggested column mapping from normalized headers */
function suggestMapping(headers: string[]): FilePreview['suggestedMapping'] {
  const normalized = headers.map(normalizeColumnName)

  function suggestCol(candidates: string[]): string | null {
    for (const c of candidates) {
      const idx = normalized.findIndex((h: string) => h === c)
      if (idx !== -1) return headers[idx]
    }
    for (const c of candidates) {
      const idx = normalized.findIndex((h: string) => h.includes(c))
      if (idx !== -1) return headers[idx]
    }
    return null
  }

  const dateCol = suggestCol(['date', 'transactiondate', 'txdate', 'valuedate'])
  const descCol = suggestCol(['description', 'transaction', 'memo', 'narrative', 'details', 'particulars', 'reference', 'payee'])
  const amountCol = suggestCol(['amount', 'value', 'sum'])
  const debitCol = suggestCol(['debit', 'debitamount', 'withdrawal', 'dr'])
  const creditCol = suggestCol(['credit', 'creditamount', 'deposit', 'cr'])
  const balanceCol = suggestCol(['balance', 'runningbalance', 'accountbalance', 'closingbalance'])
  const currencyCol = suggestCol(['currency', 'curr', 'ccy', 'currencycode', 'fx'])

  const hasDebitCredit = debitCol !== null && creditCol !== null

  return {
    date: dateCol,
    description: descCol,
    amountMode: hasDebitCredit && !amountCol ? 'debitcredit' : 'single',
    amount: amountCol,
    debit: debitCol,
    credit: creditCol,
    balance: balanceCol,
    currency: currencyCol,
  }
}

/** Return raw headers, sample rows, and suggested column mapping for the column-mapper UI */
export function extractPreview(buffer: Buffer): FilePreview | { error: string } {
  const result = extractRawRows(buffer)
  if ('error' in result) return result

  const rows = result
  const headerRowIdx = findHeaderRowIndex(rows)
  if (headerRowIdx === -1) return { error: 'No data found in file' }

  const headers = rows[headerRowIdx]
  const sampleRows = rows.slice(headerRowIdx + 1, headerRowIdx + 6)

  return {
    headers,
    sampleRows,
    suggestedMapping: suggestMapping(headers),
  }
}

/** Parse Excel using an explicit user-confirmed column mapping */
export function parseExcelWithMapping(buffer: Buffer, mapping: ColumnMapping): ParseResult {
  const result = extractRawRows(buffer)
  if ('error' in result) return { transactions: [], errors: [result.error] }

  const rows = result

  // Find header row by looking for the row that contains the user's date column name
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    if (rows[i].includes(mapping.date)) {
      headerRowIdx = i
      break
    }
  }
  if (headerRowIdx === -1) {
    return { transactions: [], errors: [`Could not find column "${mapping.date}" in the file`] }
  }

  const headers = rows[headerRowIdx]
  const getIdx = (name?: string) => (!name ? -1 : headers.indexOf(name))

  const dateIdx = getIdx(mapping.date)
  const descIdx = getIdx(mapping.description)
  const amountIdx = mapping.amountMode === 'single' ? getIdx(mapping.amount) : -1
  const debitIdx = mapping.amountMode === 'debitcredit' ? getIdx(mapping.debit) : -1
  const creditIdx = mapping.amountMode === 'debitcredit' ? getIdx(mapping.credit) : -1
  const balanceIdx = getIdx(mapping.balance)
  const currencyIdx = mapping.currency ? getIdx(mapping.currency) : -1
  if (mapping.currency && currencyIdx === -1) {
    return { transactions: [], errors: [`Currency column "${mapping.currency}" not found`] }
  }

  if (dateIdx === -1) return { transactions: [], errors: [`Date column "${mapping.date}" not found`] }
  if (descIdx === -1) return { transactions: [], errors: [`Description column "${mapping.description}" not found`] }
  if (mapping.amountMode === 'single' && amountIdx === -1) {
    return { transactions: [], errors: [`Amount column "${mapping.amount}" not found`] }
  }
  if (mapping.amountMode === 'debitcredit' && (debitIdx === -1 || creditIdx === -1)) {
    return { transactions: [], errors: ['Debit/Credit columns not found'] }
  }

  const transactions: ParsedTransaction[] = []
  const errors: string[] = []

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every(cell => !cell)) continue

    try {
      const rawDate = row[dateIdx]?.trim()
      if (!rawDate) continue

      const date = parseDate(rawDate)
      if (!date) {
        errors.push(`Row ${i + 1}: Could not parse date "${rawDate}"`)
        continue
      }

      const description = (row[descIdx] ?? '').trim()

      let amount: number
      if (amountIdx !== -1) {
        const parsed = parseAmount(row[amountIdx])
        if (parsed === null) {
          errors.push(`Row ${i + 1}: Invalid amount "${row[amountIdx]}"`)
          continue
        }
        amount = parsed
      } else {
        const credit = parseAmount(row[creditIdx]) ?? 0
        const debit = parseAmount(row[debitIdx]) ?? 0
        amount = credit - debit
      }

      const balance = balanceIdx !== -1 ? (parseAmount(row[balanceIdx]) ?? null) : null

      const rowCurrency =
        currencyIdx !== -1 ? normalizeCurrency(row[currencyIdx] ?? '') : 'USD'

      transactions.push({
        date,
        description: description.toLowerCase().replace(/\s+/g, ' '),
        originalDescription: description,
        amount,
        currency: rowCurrency,
        balance,
      })
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return { transactions, errors }
}

function parseRows(rows: string[][]): ParseResult {
  // Find the header row (first row that has Date/Transaction/Debit/Credit or similar)
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const normalized = rows[i].map(normalizeColumnName)
    if (
      normalized.some((h: string) => h === 'date' || h.includes('date')) &&
      normalized.some((h: string) => h === 'debit' || h === 'credit' || h === 'amount' || h.includes('amount'))
    ) {
      headerRowIdx = i
      break
    }
  }

  if (headerRowIdx === -1) {
    return {
      transactions: [],
      errors: [`Could not find header row. Found columns: ${rows[0]?.join(', ') ?? 'none'}`],
    }
  }

  const headerRow = rows[headerRowIdx]
  const headers = headerRow.map(normalizeColumnName)

  const dateIdx = findColumn(headers, ['date', 'transactiondate', 'txdate', 'valuedate'])
  const descCandidateIdxs = ['description', 'transaction', 'memo', 'narrative', 'details', 'particulars', 'reference', 'payee']
    .map(c => findColumn(headers, [c]))
    .filter((idx, i, arr) => idx !== -1 && arr.indexOf(idx) === i)
  const descIdx = descCandidateIdxs[0] ?? -1
  const amountIdx = findColumn(headers, ['amount', 'value', 'sum'])
  const debitIdx = findColumn(headers, ['debit', 'debitamount', 'withdrawal', 'dr'])
  const creditIdx = findColumn(headers, ['credit', 'creditamount', 'deposit', 'cr'])
  const balanceIdx = findColumn(headers, ['balance', 'runningbalance', 'accountbalance', 'closingbalance'])
  const currencyIdx = findColumn(headers, ['currency', 'curr', 'ccy', 'currencycode'])
  if (dateIdx === -1) {
    return { transactions: [], errors: [`Could not find date column. Headers: ${headerRow.join(', ')}`] }
  }
  if (descIdx === -1) {
    return { transactions: [], errors: [`Could not find description column. Headers: ${headerRow.join(', ')}`] }
  }
  if (amountIdx === -1 && (debitIdx === -1 || creditIdx === -1)) {
    return { transactions: [], errors: [`Could not find amount columns. Headers: ${headerRow.join(', ')}`] }
  }

  const transactions: ParsedTransaction[] = []
  const errors: string[] = []

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every(cell => !cell)) continue

    try {
      const rawDate = row[dateIdx]?.trim()
      if (!rawDate) continue

      const date = parseDate(rawDate)
      if (!date) {
        errors.push(`Row ${i + 1}: Could not parse date "${rawDate}"`)
        continue
      }

      // Try all description candidate columns, use first non-empty value
      const description = descCandidateIdxs
        .map(idx => (row[idx] ?? '').trim())
        .find(v => v !== '') ?? ''

      let amount: number
      if (amountIdx !== -1) {
        const parsed = parseAmount(row[amountIdx])
        if (parsed === null) {
          errors.push(`Row ${i + 1}: Invalid amount "${row[amountIdx]}"`)
          continue
        }
        amount = parsed
      } else {
        const credit = parseAmount(row[creditIdx]) ?? 0
        const debit = parseAmount(row[debitIdx]) ?? 0
        amount = credit - debit
      }

      const balance = balanceIdx !== -1 ? (parseAmount(row[balanceIdx]) ?? null) : null

      const rowCurrency =
        currencyIdx !== -1 ? normalizeCurrency(row[currencyIdx] ?? '') : 'USD'

      transactions.push({
        date,
        description: description.toLowerCase().replace(/\s+/g, ' '),
        originalDescription: description,
        amount,
        currency: rowCurrency,
        balance,
      })
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return { transactions, errors }
}

export function parseExcel(buffer: Buffer): ParseResult {
  const result = extractRawRows(buffer)
  if ('error' in result) return { transactions: [], errors: [result.error] }
  return parseRows(result)
}
