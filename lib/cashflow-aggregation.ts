import type { CashflowSummary } from '@/types'

type TxRow = {
  date: Date
  amount: number
  balance: number | null
  categoryId: string | null
  category: { id: string; name: string; color: string; type: string } | null
}

/** Pure aggregation used by /api/cashflow and /api/cashflow/consolidated */
export function aggregateCashflowFromTransactions(transactions: TxRow[]): CashflowSummary {
  const monthSet = new Set<string>()
  for (const tx of transactions) {
    monthSet.add(tx.date.toISOString().substring(0, 7))
  }
  const months = Array.from(monthSet).sort()

  const income: Record<string, number> = {}
  const incomeCategoryMap = new Map<string, { name: string; color: string; totals: Record<string, number> }>()
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
      .sort(
        (a, b) =>
          Object.values(b.totals).reduce((s, v) => s + v, 0) - Object.values(a.totals).reduce((s, v) => s + v, 0)
      )

  const incomeCategories = sortByTotal(incomeCategoryMap)
  const expenseCategories = sortByTotal(expenseCategoryMap)

  const totalExpenses: Record<string, number> = {}
  for (const cat of expenseCategories) {
    for (const [month, val] of Object.entries(cat.totals)) {
      totalExpenses[month] = (totalExpenses[month] ?? 0) + val
    }
  }

  const firstTx = transactions[0]
  const trueStart = firstTx?.balance != null ? firstTx.balance - firstTx.amount : 0

  const beginningBalances: Record<string, number> = {}
  const endingBalances: Record<string, number> = {}
  let running = trueStart
  for (const month of months) {
    beginningBalances[month] = running
    const net = (income[month] ?? 0) - (totalExpenses[month] ?? 0)
    running += net
    endingBalances[month] = running
  }

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

  return {
    totalIncome,
    totalExpenses: totalExpensesSum,
    netCashflow: totalIncome - totalExpensesSum,
    periods,
    months,
    income,
    incomeCategories,
    expenseCategories,
    totalExpensesPerMonth: totalExpenses,
    beginningBalances,
    endingBalances,
  }
}
