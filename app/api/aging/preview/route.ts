import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { extractRawRows, findHeaderRowIndex } from '@/lib/excel/parser'
import type { AgingColumnMapping } from '@/types'

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function suggestAgingMapping(headers: string[]): Partial<AgingColumnMapping> {
  const find = (candidates: string[]): string | null => {
    for (const h of headers) {
      const n = norm(h)
      if (candidates.some(c => n === c || n.includes(c))) return h
    }
    return null
  }

  return {
    dueDate:       find(['duedate', 'due', 'paymentdue', 'paymentduedate', 'dueby']) ?? undefined,
    amount:        find(['amount', 'amountdue', 'balance', 'openbalance', 'outstanding', 'total']) ?? undefined,
    currency:      find(['currency', 'curr', 'ccy']) ?? undefined,
    customer:      find(['customer', 'customername', 'client', 'clientname', 'debtor']) ?? undefined,
    contactName:   find(['contactname', 'contact', 'name', 'fullname']) ?? undefined,
    issueDate:     find(['issuedate', 'invoicedate', 'date', 'docdate']) ?? undefined,
    invoiceNumber: find(['invoicenumber', 'invoice', 'invoiceno', 'docnumber', 'reference', 'ref']) ?? undefined,
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = extractRawRows(buffer)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })

    const headerRowIdx = findHeaderRowIndex(result)
    if (headerRowIdx === -1) return NextResponse.json({ error: 'No data found in file' }, { status: 400 })

    const headers = result[headerRowIdx]
    const sampleRows = result.slice(headerRowIdx + 1, headerRowIdx + 6)
    const suggestedMapping = suggestAgingMapping(headers)

    return NextResponse.json({ headers, sampleRows, suggestedMapping })
  } catch (err) {
    console.error('Aging preview error:', err)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
