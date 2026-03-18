import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const category = await prisma.category.findUnique({ where: { id: params.id } })
  if (!category || category.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
  }

  const body = await request.json()
  const { name, color, type } = body

  const updated = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(name ? { name: name.trim() } : {}),
      ...(color ? { color } : {}),
      ...(type ? { type } : {}),
    },
  })

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

  const category = await prisma.category.findUnique({ where: { id: params.id } })
  if (!category || category.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 404 })
  }

  await prisma.category.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
