import { prisma } from "@/lib/prisma";
import type { CategoryItem, ClassificationResult } from "@/types";
import { keywordClassifyBatch, type KeywordRule } from "./keyword-classifier";

/** Keyword rule confidences are ≥ ~0.75; fallback is 0.5 — prefer keyword when clearly above fallback. */
const KEYWORD_CONFIDENCE_THRESHOLD = 0.55;

function normalizeDescriptionForDedupe(input: string): string {
  return input.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

async function ensureGeneralCategory(
  categories: CategoryItem[],
  spec: { name: string; type: string; color: string; sortOrder: number },
): Promise<CategoryItem[]> {
  if (categories.some((c) => c.name.toLowerCase() === spec.name.toLowerCase()))
    return categories;

  const created = await prisma.category.create({
    data: {
      userId: null,
      name: spec.name,
      type: spec.type,
      color: spec.color,
      isDefault: true,
      sortOrder: spec.sortOrder,
    },
  });

  return [...categories, created as unknown as CategoryItem];
}

async function ensureTransfersCategory(
  _userId: string,
  categories: CategoryItem[],
): Promise<CategoryItem[]> {
  const hasTransfers = categories.some(
    (c) => c.name.toLowerCase() === "transfers",
  );
  if (hasTransfers) return categories;

  const created = await prisma.category.create({
    data: {
      userId: null,
      name: "Transfers",
      type: "expense",
      color: "#a3a3a3",
      isDefault: true,
      sortOrder: 5,
    },
  });

  return [...categories, created as unknown as CategoryItem];
}

async function loadKeywordRules(userId: string): Promise<KeywordRule[]> {
  const rows = await prisma.categoryKeyword.findMany({
    where: {
      OR: [{ userId }, { userId: null }],
      category: {
        OR: [{ userId }, { userId: null }],
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  const byKeyword = new Map<string, KeywordRule>();
  const userRows = rows.filter((row) => row.userId === userId);
  const globalRows = rows.filter((row) => row.userId === null);

  for (const row of [...userRows, ...globalRows]) {
    if (byKeyword.has(row.normalizedKeyword)) continue;
    byKeyword.set(row.normalizedKeyword, {
      categoryId: row.categoryId,
      normalizedKeyword: row.normalizedKeyword,
      confidence: row.confidence,
    });
  }

  return Array.from(byKeyword.values());
}

export async function batchClassify(
  batchId: string,
  userId: string,
): Promise<void> {
  try {
    // Get all transactions for this batch
    const transactions = await prisma.transaction.findMany({
      where: { uploadBatchId: batchId, userId },
      select: {
        id: true,
        description: true,
        originalDescription: true,
        amount: true,
      },
    });

    // Get user's categories + system defaults
    const categories = (await prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      orderBy: { sortOrder: "asc" },
    })) as unknown as CategoryItem[];

    let categoriesForRules = categories as CategoryItem[];
    categoriesForRules = await ensureGeneralCategory(categoriesForRules, {
      name: "Income",
      type: "income",
      color: "#22c55e",
      sortOrder: 1,
    });
    categoriesForRules = await ensureGeneralCategory(categoriesForRules, {
      name: "Salaries",
      type: "expense",
      color: "#ef4444",
      sortOrder: 2,
    });
    categoriesForRules = await ensureGeneralCategory(categoriesForRules, {
      name: "Other Expenses",
      type: "expense",
      color: "#94a3b8",
      sortOrder: 99,
    });
    const categoriesWithTransfers = await ensureTransfersCategory(
      userId,
      categoriesForRules,
    );
    const keywordRules = await loadKeywordRules(userId);

    const fallbackCategory =
      categoriesWithTransfers.find((c) => c.name === "Other Expenses") ??
      categoriesWithTransfers[categoriesWithTransfers.length - 1];
    const incomeCategory = categoriesWithTransfers.find(
      (c) => c.name === "Income",
    );
    if (!fallbackCategory) {
      await prisma.uploadBatch.update({
        where: { id: batchId },
        data: {
          status: "failed",
          errors: JSON.stringify(["No categories available"]),
        },
      });
      return;
    }

    const hasDescription = (value: string | null | undefined): boolean =>
      typeof value === "string" && value.trim().length > 0;

    const uncategorizedTxIds = transactions
      .filter((t) => !hasDescription(t.originalDescription) && !hasDescription(t.description))
      .map((t) => t.id);

    if (uncategorizedTxIds.length > 0) {
      await prisma.transaction.updateMany({
        where: { id: { in: uncategorizedTxIds } },
        data: {
          categoryId: null,
          categoryConfidence: null,
          classifiedBy: "uncategorized",
        },
      });
    }

    const uncategorizedTxIdSet = new Set(uncategorizedTxIds);
    const classifiableTxs = transactions.filter((t) => !uncategorizedTxIdSet.has(t.id));

    const creditTxs = classifiableTxs.filter(
      (t: { id: string; description: string; amount: number }) => t.amount > 0,
    );
    const debitTxs = classifiableTxs.filter(
      (t: { id: string; description: string; amount: number }) => t.amount <= 0,
    );

    // Deduplicate debits by description for AI classification
    const uniqueDescMap = new Map<string, string[]>(); // normalized description -> [ids]
    const idToPromptDesc = new Map<string, string>(); // id -> original (preferred) description for prompt
    for (const tx of debitTxs) {
      const promptDesc = tx.originalDescription?.trim()
        ? tx.originalDescription
        : tx.description;
      idToPromptDesc.set(tx.id, promptDesc);

      const key = normalizeDescriptionForDedupe(promptDesc);
      const existing = uniqueDescMap.get(key) ?? [];
      existing.push(tx.id);
      uniqueDescMap.set(key, existing);
    }

    type TxLite = { id: string; description: string; amount: number };

    const uniqueTransactions = Array.from(uniqueDescMap.entries()).map(
      ([desc, ids]) => ({
        id: ids[0], // Use first ID for classification
        description: idToPromptDesc.get(ids[0]) ?? desc,
        amount: debitTxs.find((t: TxLite) => t.id === ids[0])!.amount,
        allIds: ids,
      }),
    );

    if (uniqueTransactions.length > 0) {
      // Chunk into batches of 100
      const chunkSize = 100;
      const chunks: (typeof uniqueTransactions)[] = [];
      for (let i = 0; i < uniqueTransactions.length; i += chunkSize) {
        chunks.push(uniqueTransactions.slice(i, i + chunkSize));
      }

      let processedCount = 0;

      for (const chunk of chunks) {
        const results: ClassificationResult[] = keywordClassifyBatch(
          categoriesWithTransfers,
          chunk.map((t: TxLite) => ({ id: t.id, description: t.description })),
          keywordRules,
        );

        // Fan results back to all transactions sharing description
        const updates: Promise<unknown>[] = [];
        for (const result of results) {
          const original = chunk.find((t) => t.id === result.id);
          if (!original) continue;

          updates.push(
            prisma.transaction.updateMany({
              where: { id: { in: original.allIds } },
              data: {
                categoryId: result.categoryId,
                categoryConfidence: result.confidence,
                classifiedBy: "rules",
              },
            }),
          );
          processedCount += original.allIds.length;
        }

        await Promise.all(updates);

        await prisma.uploadBatch.update({
          where: { id: batchId },
          data: { processedRows: processedCount },
        });
      }
    }

    if (creditTxs.length > 0 && fallbackCategory) {
      type CreditTx = {
        id: string;
        description: string;
        originalDescription: string | null;
        amount: number;
      };
      const creditInputs = (creditTxs as CreditTx[]).map((tx) => ({
        id: tx.id,
        description: tx.originalDescription?.trim()
          ? tx.originalDescription
          : tx.description,
      }));
      const creditResults = keywordClassifyBatch(
        categoriesWithTransfers,
        creditInputs,
        keywordRules,
      );
      const creditUpdates = creditResults.map((result, i) => {
        const useKeyword = result.confidence > KEYWORD_CONFIDENCE_THRESHOLD;
        const categoryId = useKeyword
          ? result.categoryId
          : (incomeCategory?.id ?? fallbackCategory.id);
        const confidence = useKeyword
          ? result.confidence
          : incomeCategory
            ? 1
            : 0.5;
        return prisma.transaction.update({
          where: { id: creditInputs[i]!.id },
          data: {
            categoryId,
            categoryConfidence: confidence,
            classifiedBy: "rules",
          },
        });
      });
      await Promise.all(creditUpdates);
    }

    await prisma.uploadBatch.update({
      where: { id: batchId },
      data: { status: "complete", processedRows: transactions.length },
    });
  } catch (err) {
    await prisma.uploadBatch.update({
      where: { id: batchId },
      data: {
        status: "failed",
        errors: JSON.stringify([
          err instanceof Error ? err.message : "Classification failed",
        ]),
      },
    });
  }
}
