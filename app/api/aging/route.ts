import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseAgingExcel } from '@/lib/excel/aging-parser'
import type { AgingColumnMapping } from '@/types'
import { nanoid } from 'nanoid'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reports = await prisma.agingReport.findMany({
    where: { userId: session.user.id },
    orderBy: { reportDate: 'desc' },
    take: 24,
  })

  return NextResponse.json(reports)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const mappingRaw = formData.get('columnMapping') as string | null
    if (!mappingRaw) return NextResponse.json({ error: 'Column mapping is required' }, { status: 400 })
    const mapping: AgingColumnMapping = JSON.parse(mappingRaw)

    const reportDateRaw = formData.get('reportDate') as string | null
    const reportDate = reportDateRaw ? new Date(reportDateRaw) : new Date()

    const buffer = Buffer.from(await file.arrayBuffer())
    const { totals, errors, currency } = parseAgingExcel(buffer, mapping, reportDate)

    const report = await prisma.agingReport.create({
      data: {
        id: nanoid(),
        userId,
        reportDate,
        current: totals.current,
        days1to30: totals.days1to30,
        days31to60: totals.days31to60,
        days61to90: totals.days61to90,
        days90plus: totals.days90plus,
        currency,
      },
    })

    return NextResponse.json({ report, warnings: errors })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = session.user.id

  if (searchParams.get('all') === 'true' || searchParams.get('all') === '1') {
    await prisma.agingReport.deleteMany({ where: { userId } })
    return NextResponse.json({ ok: true })
  }

  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id or all=true' }, { status: 400 })

  await prisma.agingReport.deleteMany({ where: { id, userId } })
  return NextResponse.json({ ok: true })
}
