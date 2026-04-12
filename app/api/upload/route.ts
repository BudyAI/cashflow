import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseExcel, parseExcelWithMapping } from '@/lib/excel/parser'
import type { ColumnMapping } from '@/types'
import { batchClassify } from '@/lib/classification/batch-processor'
import { nanoid } from 'nanoid'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batches = await prisma.uploadBatch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, totalRows: true, processedRows: true, createdAt: true },
  })

  return NextResponse.json(batches)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const columnMappingRaw = formData.get('columnMapping') as string | null
    const columnMapping: ColumnMapping | null = columnMappingRaw ? JSON.parse(columnMappingRaw) : null

    const buffer = Buffer.from(await file.arrayBuffer())
    const { transactions: parsed, errors } = columnMapping
      ? parseExcelWithMapping(buffer, columnMapping)
      : parseExcel(buffer)

    if (parsed.length === 0) {
      return NextResponse.json({ error: 'No valid transactions found', details: errors }, { status: 400 })
    }

    const batch = await prisma.uploadBatch.create({
      data: {
        id: nanoid(),
        userId,
        status: 'processing',
        totalRows: parsed.length,
        errors: JSON.stringify(errors),
      },
    })

    await prisma.transaction.createMany({
      data: parsed.map((t: typeof parsed[number]) => ({
        id: nanoid(),
        userId,
        uploadBatchId: batch.id,
        date: t.date,
        description: t.description,
        originalDescription: t.originalDescription,
        amount: t.amount,
        currency: t.currency,
        balance: t.balance ?? null,
        classifiedBy: 'pending',
      })),
    })

    // Non-blocking classification
    setImmediate(() => {
      batchClassify(batch.id, userId).catch(console.error)
    })

    return NextResponse.json({
      batchId: batch.id,
      totalRows: parsed.length,
      status: 'processing',
      parseErrors: errors,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
