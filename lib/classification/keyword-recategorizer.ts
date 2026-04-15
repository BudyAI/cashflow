import { prisma } from "@/lib/prisma";
import {
  buildKeywordRecategorizationCandidateWhere,
  descriptionMatchesKeyword,
  normalizeKeywordForRecategorization,
} from "./keyword-match";
import { keywordClassifyBatch, type KeywordRule } from "./keyword-classifier";
import type { CategoryItem } from "@/types";

type RecategorizeForKeywordInput = {
  userId: string;
  categoryId: string;
  keyword: string;
  confidence: number;
};

export async function recategorizeTransactionsForKeyword(
  input: RecategorizeForKeywordInput,
): Promise<number> {
  const normalizedKeyword = normalizeKeywordForRecategorization(input.keyword);
  if (!normalizedKeyword) return 0;

  const [candidates, categories, keywordRows] = await Promise.all([
    prisma.transaction.findMany({
      where: buildKeywordRecategorizationCandidateWhere({
        userId: input.userId,
        categoryId: input.categoryId,
        normalizedKeyword,
      }),
      select: { id: true, description: true },
    }),
    prisma.category.findMany({
      where: { OR: [{ userId: input.userId }, { userId: null }] },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.categoryKeyword.findMany({
      where: {
        OR: [{ userId: input.userId }, { userId: null }],
        category: {
          OR: [{ userId: input.userId }, { userId: null }],
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const matchingCandidates = candidates.filter((transaction) =>
    descriptionMatchesKeyword(transaction.description, normalizedKeyword),
  );
  if (matchingCandidates.length === 0) return 0;

  const byKeyword = new Map<string, KeywordRule>();
  const userRows = keywordRows.filter((row) => row.userId === input.userId);
  const globalRows = keywordRows.filter((row) => row.userId === null);
  for (const row of [...userRows, ...globalRows]) {
    if (byKeyword.has(row.normalizedKeyword)) continue;
    byKeyword.set(row.normalizedKeyword, {
      categoryId: row.categoryId,
      normalizedKeyword: row.normalizedKeyword,
      confidence: row.confidence,
    });
  }

  const rules = Array.from(byKeyword.values());
  const classified = keywordClassifyBatch(
    categories as unknown as CategoryItem[],
    matchingCandidates,
    rules,
  );
  const byCategory = new Map<string, string[]>();
  for (const result of classified) {
    const key = `${result.categoryId}:${result.confidence}`;
    const existing = byCategory.get(key) ?? [];
    existing.push(result.id);
    byCategory.set(key, existing);
  }

  let updatedCount = 0;
  for (const [bucket, ids] of byCategory.entries()) {
    const separator = bucket.indexOf(":");
    const categoryId = bucket.slice(0, separator);
    const confidence = Number(bucket.slice(separator + 1));
    const { count } = await prisma.transaction.updateMany({
      where: { id: { in: ids } },
      data: {
        categoryId,
        categoryConfidence: confidence,
        classifiedBy: "rules",
      },
    });
    updatedCount += count;
  }

  return updatedCount;
}
