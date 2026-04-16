import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; keywordId: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyword = await prisma.categoryKeyword.findUnique({
    where: { id: params.keywordId },
  });

  if (
    !keyword ||
    keyword.categoryId !== params.id ||
    keyword.userId !== session.user.id
  ) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  await prisma.categoryKeyword.delete({ where: { id: params.keywordId } });
  return NextResponse.json({ success: true });
}
