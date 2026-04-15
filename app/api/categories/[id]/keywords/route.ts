import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  recategorizeTransactionsForKeyword,
} from "@/lib/classification/keyword-recategorizer";
import { normalizeKeywordForRecategorization } from "@/lib/classification/keyword-match";
import { nanoid } from "nanoid";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category || (category.userId !== null && category.userId !== session.user.id)) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  try {
    const keywords = await prisma.categoryKeyword.findMany({
      where: {
        categoryId: params.id,
        OR: [{ userId: session.user.id }, { userId: null }],
      },
      orderBy: [{ userId: "desc" }, { keyword: "asc" }],
    });
    return NextResponse.json(keywords);
  } catch {
    return NextResponse.json({ error: "Failed to load keywords" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category || (category.userId !== null && category.userId !== session.user.id)) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const body = await request.json();
  const keywordRaw = String(body?.keyword ?? "").trim();
  const confidenceInput = Number(body?.confidence);
  const confidence = Number.isFinite(confidenceInput)
    ? Math.max(0, Math.min(1, confidenceInput))
    : 0.8;

  if (!keywordRaw) {
    return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
  }

  const normalizedKeyword = normalizeKeywordForRecategorization(keywordRaw);
  const existing = await prisma.categoryKeyword.findFirst({
    where: {
      categoryId: params.id,
      userId: session.user.id,
      normalizedKeyword,
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Keyword already exists" }, { status: 409 });
  }

  const created = await prisma.categoryKeyword.create({
    data: {
      id: nanoid(),
      categoryId: params.id,
      userId: session.user.id,
      keyword: keywordRaw,
      normalizedKeyword,
      confidence,
    },
  });

  const updatedCount = await recategorizeTransactionsForKeyword({
    userId: session.user.id,
    categoryId: params.id,
    keyword: normalizedKeyword,
    confidence,
  });

  return NextResponse.json({ ...created, updatedCount }, { status: 201 });
}
