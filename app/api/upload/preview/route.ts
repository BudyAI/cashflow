import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { extractPreview } from '@/lib/excel/parser'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = extractPreview(buffer)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Preview error:', err)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
