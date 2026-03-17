import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { batchClassify } from '@/lib/classification/batch-processor'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  const body = await request.json()
  const { transactionIds, all } = body as { transactionIds?: string[]; all?: boolean }

  // Resolve which transactions to classify
  let transactions: { id: string }[]

  if (all) {
    // Classify every transaction still pending for this user
    transactions = await prisma.transaction.findMany({
      where: { userId, classifiedBy: 'pending' },
      select: { id: true },
    })
  } else {
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json({ error: 'transactionIds array required (or pass all: true)' }, { status: 400 })
    }
    transactions = await prisma.transaction.findMany({
      where: { id: { in: transactionIds }, userId },
      select: { id: true },
    })
  }

  if (transactions.length === 0) {
    return NextResponse.json({ count: 0, status: 'nothing_to_classify' })
  }

  // Create a temporary batch for tracking
  const batchId = nanoid()
  await prisma.uploadBatch.create({
    data: { id: batchId, userId, status: 'processing', totalRows: transactions.length },
  })

  // Point the transactions at this batch
  await prisma.transaction.updateMany({
    where: { id: { in: transactions.map(t => t.id) } },
    data: { uploadBatchId: batchId },
  })

  setImmediate(() => {
    batchClassify(batchId, userId).catch(console.error)
  })

  return NextResponse.json({ batchId, count: transactions.length, status: 'processing' })
}
