import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
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

  const { count } = await prisma.transaction.deleteMany({
    where: { uploadBatchId: params.batchId },
  })

  await prisma.uploadBatch.delete({
    where: { id: params.batchId },
  })

  return NextResponse.json({ deleted: count })
}
