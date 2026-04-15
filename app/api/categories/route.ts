import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  assertCategoryReorderAuthorization,
  validateOrderedCategoryIds,
} from '@/lib/categories/reorder'
import { nanoid } from 'nanoid'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: session.user.id }, { userId: null }] },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(categories)
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  let orderedCategoryIds: string[]
  try {
    orderedCategoryIds = validateOrderedCategoryIds(body?.orderedCategoryIds)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request body' },
      { status: 400 }
    )
  }

  const categories = await prisma.category.findMany({
    where: { id: { in: orderedCategoryIds } },
    select: { id: true, userId: true },
  })
  try {
    assertCategoryReorderAuthorization(orderedCategoryIds, categories, session.user.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reorder validation failed'
    const status = message.includes('not found') ? 404 : 403
    return NextResponse.json({ error: message }, { status })
  }

  await prisma.$transaction(
    orderedCategoryIds.map((id, index) =>
      prisma.category.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    )
  )

  return NextResponse.json({ success: true, updated: orderedCategoryIds.length })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, color = '#94a3b8', type = 'expense' } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const category = await prisma.category.create({
    data: {
      id: nanoid(),
      userId: session.user.id,
      name: name.trim(),
      color,
      type,
    },
  })

  return NextResponse.json(category, { status: 201 })
}
