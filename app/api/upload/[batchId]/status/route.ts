import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batch = await prisma.uploadBatch.findUnique({
    where: { id: params.batchId },
  })

  if (!batch || batch.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: batch.id,
    status: batch.status,
    totalRows: batch.totalRows,
    processedRows: batch.processedRows,
    errors: JSON.parse(batch.errors),
  })
}
