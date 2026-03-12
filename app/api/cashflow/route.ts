import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const where: Record<string, unknown> = { userId: session.user.id }
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

  // Collect all months in sorted order
  const monthSet = new Set<string>()
  for (const tx of transactions) {
    monthSet.add(tx.date.toISOString().substring(0, 7))
  }
  const months = Array.from(monthSet).sort()

  // income per month (aggregate)
  const income: Record<string, number> = {}

  // income categories: categoryId -> { name, color, totals by month }
  const incomeCategoryMap = new Map<string, { name: string; color: string; totals: Record<string, number> }>()

  // expense categories: categoryId -> { name, color, totals by month }
  const expenseCategoryMap = new Map<string, { name: string; color: string; totals: Record<string, number> }>()

  for (const tx of transactions) {
    const month = tx.date.toISOString().substring(0, 7)
    if (tx.amount > 0) {
      income[month] = (income[month] ?? 0) + tx.amount
      const key = tx.categoryId ?? '__income__'
      const name = tx.category?.name ?? 'Income'
      const color = tx.category?.color ?? '#22c55e'
      if (!incomeCategoryMap.has(key)) {
        incomeCategoryMap.set(key, { name, color, totals: {} })
      }
      incomeCategoryMap.get(key)!.totals[month] = (incomeCategoryMap.get(key)!.totals[month] ?? 0) + tx.amount
    } else {
      const key = tx.categoryId ?? '__uncategorized__'
      const name = tx.category?.name ?? 'Uncategorized'
      const color = tx.category?.color ?? '#94a3b8'
      if (!expenseCategoryMap.has(key)) {
        expenseCategoryMap.set(key, { name, color, totals: {} })
      }
      expenseCategoryMap.get(key)!.totals[month] = (expenseCategoryMap.get(key)!.totals[month] ?? 0) + Math.abs(tx.amount)
    }
  }

  const sortByTotal = (map: typeof incomeCategoryMap) =>
    Array.from(map.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) =>
        Object.values(b.totals).reduce((s, v) => s + v, 0) -
        Object.values(a.totals).reduce((s, v) => s + v, 0)
      )

  const incomeCategories = sortByTotal(incomeCategoryMap)
  const expenseCategories = sortByTotal(expenseCategoryMap)

  // Total expenses per month
  const totalExpenses: Record<string, number> = {}
  for (const cat of expenseCategories) {
    for (const [month, val] of Object.entries(cat.totals)) {
      totalExpenses[month] = (totalExpenses[month] ?? 0) + val
    }
  }

  // Derive true starting balance from the first transaction's balance field
  const firstTx = transactions[0]
  const trueStart = firstTx?.balance != null
    ? firstTx.balance - firstTx.amount
    : 0

  // Running balances
  const beginningBalances: Record<string, number> = {}
  const endingBalances: Record<string, number> = {}
  let running = trueStart
  for (const month of months) {
    beginningBalances[month] = running
    const net = (income[month] ?? 0) - (totalExpenses[month] ?? 0)
    running += net
    endingBalances[month] = running
  }

  // Legacy summary fields for existing charts
  const periods = months.map(month => {
    const inc = income[month] ?? 0
    const exp = totalExpenses[month] ?? 0
    return {
      month,
      income: inc,
      expenses: exp,
      net: inc - exp,
      runningTotal: endingBalances[month],
    }
  })
  const totalIncome = periods.reduce((s, p) => s + p.income, 0)
  const totalExpensesSum = periods.reduce((s, p) => s + p.expenses, 0)

  return NextResponse.json({
    // legacy
    totalIncome,
    totalExpenses: totalExpensesSum,
    netCashflow: totalIncome - totalExpensesSum,
    periods,
    // table data
    months,
    income,
    incomeCategories,
    expenseCategories,
    totalExpensesPerMonth: totalExpenses,
    beginningBalances,
    endingBalances,
  })
}
