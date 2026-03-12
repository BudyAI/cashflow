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

  const body = await request.json()
  const { transactionIds } = body as { transactionIds: string[] }

  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return NextResponse.json({ error: 'transactionIds array required' }, { status: 400 })
  }

  // Verify ownership
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: transactionIds }, userId: session.user.id },
  })

  if (transactions.length === 0) {
    return NextResponse.json({ error: 'No matching transactions found' }, { status: 404 })
  }

  // Create a temporary batch for tracking
  const batchId = nanoid()
  await prisma.uploadBatch.create({
    data: {
      id: batchId,
      userId: session.user.id,
      status: 'processing',
      totalRows: transactions.length,
    },
  })

  // Update transactions to use this batch
  await prisma.transaction.updateMany({
    where: { id: { in: transactions.map((t: { id: string }) => t.id) } },
    data: { uploadBatchId: batchId },
  })

  setImmediate(() => {
    batchClassify(batchId, session.user!.id!).catch(console.error)
  })

  return NextResponse.json({ batchId, status: 'processing' })
}
