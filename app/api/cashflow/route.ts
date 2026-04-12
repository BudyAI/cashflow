import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isValidCurrencyParam } from '@/lib/currency'
import { aggregateCashflowFromTransactions } from '@/lib/cashflow-aggregation'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const currencyParam = searchParams.get('currency')
  // Default USD when missing so legacy rows and UI stay consistent
  const currency = isValidCurrencyParam(currencyParam) ? currencyParam : 'USD'

  const where: Record<string, unknown> = { userId: session.user.id, currency }
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    }
  }

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      date: true,
      amount: true,
      balance: true,
      categoryId: true,
      category: { select: { id: true, name: true, color: true, type: true } },
    },
    orderBy: { date: 'asc' },
  })

  const summary = aggregateCashflowFromTransactions(transactions)

  return NextResponse.json(summary)
}
