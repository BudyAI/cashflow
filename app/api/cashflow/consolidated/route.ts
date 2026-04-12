import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isValidCurrencyParam } from '@/lib/currency'
import { aggregateCashflowFromTransactions } from '@/lib/cashflow-aggregation'
import {
  buildRequiredUtcDays,
  convertAmountToDisplay,
  ecbFetchWindow,
  fetchEcbUsdEurAndIlsEur,
  ilsPerUsdForUtcDays,
  utcDayString,
} from '@/lib/ecb-fx'
import type { ConsolidatedCashflowResponse, Currency } from '@/types'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const displayParam = searchParams.get('displayCurrency')
  if (!isValidCurrencyParam(displayParam)) {
    return NextResponse.json({ error: 'displayCurrency must be USD or ILS' }, { status: 400 })
  }
  const displayCurrency: Currency = displayParam

  const where: Record<string, unknown> = { userId: session.user.id }
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    }
  }

  const raw = await prisma.transaction.findMany({
    where,
    select: {
      date: true,
      amount: true,
      balance: true,
      currency: true,
      categoryId: true,
      category: { select: { id: true, name: true, color: true, type: true } },
    },
    orderBy: { date: 'asc' },
  })

  const txs = raw.map(t => ({
    ...t,
    currency: (t.currency === 'ILS' ? 'ILS' : 'USD') as Currency,
  }))

  if (txs.length === 0) {
    const empty = aggregateCashflowFromTransactions([])
    const body: ConsolidatedCashflowResponse = {
      ...empty,
      meta: {
        rateProvider: 'ECB_EXR',
        note: 'No transactions in range. ECB reference rates (via EUR), indicative; conversion uses UTC transaction date with carry-forward of last ECB business day.',
      },
    }
    return NextResponse.json(body)
  }

  const requiredDays = buildRequiredUtcDays(txs.map(t => t.date))
  const win = ecbFetchWindow(requiredDays)
  if (!win) {
    return NextResponse.json({ error: 'Could not derive date window' }, { status: 400 })
  }

  let usdPerEur: Map<string, number>
  let ilsPerEur: Map<string, number>
  try {
    ;({ usdPerEur, ilsPerEur } = await fetchEcbUsdEurAndIlsEur(win.start, win.end))
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ECB fetch failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const { rates, missingDays } = ilsPerUsdForUtcDays(usdPerEur, ilsPerEur, requiredDays)
  if (missingDays.length > 0) {
    return NextResponse.json(
      {
        error:
          'Missing ECB reference rates for one or more transaction dates (UTC). Try widening the date range or check ECB data availability.',
        missingDays,
      },
      { status: 422 }
    )
  }

  let converted: Parameters<typeof aggregateCashflowFromTransactions>[0]
  try {
    converted = txs.map(t => {
      const day = utcDayString(t.date)
      const ilsPerUsd = rates.get(day)
      if (ilsPerUsd == null) {
        throw new Error(`No rate for ${day}`)
      }
      return {
        date: t.date,
        amount: convertAmountToDisplay(t.amount, t.currency, displayCurrency, ilsPerUsd),
        balance:
          t.balance != null
            ? convertAmountToDisplay(t.balance, t.currency, displayCurrency, ilsPerUsd)
            : null,
        categoryId: t.categoryId,
        category: t.category,
      }
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Rate lookup error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const summary = aggregateCashflowFromTransactions(converted)
  const body: ConsolidatedCashflowResponse = {
    ...summary,
    meta: {
      rateProvider: 'ECB_EXR',
      note:
        'ECB euro foreign-exchange reference rates (USD/EUR and ILS/EUR), triangulated to ILS per USD. Indicative only. ' +
        'Each amount uses the rate for the transaction UTC calendar day, with carry-forward when ECB did not publish that calendar day.',
    },
  }

  return NextResponse.json(body)
}
