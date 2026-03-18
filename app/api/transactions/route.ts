import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('categoryId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const type = searchParams.get('type') as 'income' | 'expense' | null
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') ?? '50'), 200)

  const where: Record<string, unknown> = { userId: session.user.id }

  if (search) {
    where.description = { contains: search.toLowerCase() }
  }
  if (categoryId) {
    where.categoryId = categoryId
  }
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    }
  }
  if (type === 'income') {
    where.amount = { gt: 0 }
  } else if (type === 'expense') {
    where.amount = { lt: 0 }
  }

  const [total, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: { category: { select: { id: true, name: true, color: true, type: true } } },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    transactions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ids } = await request.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 })
  }

  const { count } = await prisma.transaction.deleteMany({
    where: { id: { in: ids }, userId: session.user.id },
  })

  return NextResponse.json({ deleted: count })
}
