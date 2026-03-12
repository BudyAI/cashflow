import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { categoryId } = body

  const transaction = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { category: true },
  })

  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const newCategory = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!newCategory) {
    return NextResponse.json({ error: 'Category not found' }, { status: 400 })
  }

  const overrideHistory = JSON.parse(transaction.overrideHistory) as unknown[]
  overrideHistory.push({
    fromCategoryId: transaction.categoryId,
    toCategoryId: categoryId,
    at: new Date().toISOString(),
  })

  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: {
      categoryId,
      manuallyOverridden: true,
      overrideHistory: JSON.stringify(overrideHistory),
      classifiedBy: 'user',
    },
    include: { category: { select: { id: true, name: true, color: true, type: true } } },
  })

  // Record correction for future classification prompts
  if (transaction.categoryId && transaction.categoryId !== categoryId) {
    await prisma.classificationHistory.create({
      data: {
        id: nanoid(),
        userId: session.user.id,
        transactionId: params.id,
        descriptionNormalized: transaction.description,
        descriptionOriginal: transaction.originalDescription,
        amount: transaction.amount,
        suggestedCategoryId: transaction.categoryId,
        suggestedCategoryName: transaction.category?.name ?? 'Unknown',
        correctedCategoryId: categoryId,
        correctedCategoryName: newCategory.name,
      },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const transaction = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!transaction || transaction.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.transaction.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
