import { prisma } from '@/lib/prisma'
import type { CategoryItem, ClassificationResult } from '@/types'
import { keywordClassifyBatch } from './keyword-classifier'

function normalizeDescriptionForDedupe(input: string): string {
  return input
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

async function ensureTransfersCategory(userId: string, categories: CategoryItem[]): Promise<CategoryItem[]> {
  const hasTransfers = categories.some(c => c.name.toLowerCase() === 'transfers')
  if (hasTransfers) return categories

  const created = await prisma.category.create({
    data: {
      userId: null,
      name: 'Transfers',
      type: 'expense',
      color: '#a3a3a3',
      isDefault: true,
      sortOrder: 5,
    },
  })

  return [...categories, created as unknown as CategoryItem]
}

export async function batchClassify(batchId: string, userId: string): Promise<void> {
  try {
    // Get all transactions for this batch
    const transactions = await prisma.transaction.findMany({
      where: { uploadBatchId: batchId, userId },
      select: { id: true, description: true, originalDescription: true, amount: true },
    })

    // Get user's categories + system defaults
    const categories = await prisma.category.findMany({
      where: { OR: [{ userId }, { userId: null }] },
      orderBy: { sortOrder: 'asc' },
    }) as unknown as CategoryItem[]

    const categoriesWithTransfers = await ensureTransfersCategory(userId, categories)

    const fallbackCategory = categories.find(c => c.name === 'Other Expenses') ?? categories[categories.length - 1]
    const incomeCategory = categories.find(c => c.name === 'Income')
    if (!fallbackCategory) {
      await prisma.uploadBatch.update({
        where: { id: batchId },
        data: { status: 'failed', errors: JSON.stringify(['No categories available']) },
      })
      return
    }

    // Auto-classify credits (positive amounts) as Income
    const creditTxs = transactions.filter((t: { id: string; description: string; amount: number }) => t.amount > 0)
    const debitTxs = transactions.filter((t: { id: string; description: string; amount: number }) => t.amount <= 0)

    if (incomeCategory && creditTxs.length > 0) {
      await prisma.transaction.updateMany({
        where: { id: { in: creditTxs.map((t: { id: string; description: string; amount: number }) => t.id) } },
        data: { categoryId: incomeCategory.id, categoryConfidence: 1, classifiedBy: 'rules' },
      })
    }

    // Deduplicate debits by description for AI classification
    const uniqueDescMap = new Map<string, string[]>() // normalized description -> [ids]
    const idToPromptDesc = new Map<string, string>() // id -> original (preferred) description for prompt
    for (const tx of debitTxs) {
      const promptDesc = tx.originalDescription?.trim() ? tx.originalDescription : tx.description
      idToPromptDesc.set(tx.id, promptDesc)

      const key = normalizeDescriptionForDedupe(promptDesc)
      const existing = uniqueDescMap.get(key) ?? []
      existing.push(tx.id)
      uniqueDescMap.set(key, existing)
    }

    type TxLite = { id: string; description: string; amount: number }

    const uniqueTransactions = Array.from(uniqueDescMap.entries()).map(([desc, ids]) => ({
      id: ids[0], // Use first ID for classification
      description: idToPromptDesc.get(ids[0]) ?? desc,
      amount: debitTxs.find((t: TxLite) => t.id === ids[0])!.amount,
      allIds: ids,
    }))

    if (uniqueTransactions.length > 0) {
      // Chunk into batches of 100
      const chunkSize = 100
      const chunks: typeof uniqueTransactions[] = []
      for (let i = 0; i < uniqueTransactions.length; i += chunkSize) {
        chunks.push(uniqueTransactions.slice(i, i + chunkSize))
      }

      let processedCount = creditTxs.length

      for (const chunk of chunks) {
        const results: ClassificationResult[] = keywordClassifyBatch(
          categoriesWithTransfers,
          chunk.map((t: TxLite) => ({ id: t.id, description: t.description }))
        )

        // Fan results back to all transactions sharing description
        const updates: Promise<unknown>[] = []
        for (const result of results) {
          const original = chunk.find(t => t.id === result.id)
          if (!original) continue

          updates.push(
            prisma.transaction.updateMany({
              where: { id: { in: original.allIds } },
              data: {
                categoryId: result.categoryId,
                categoryConfidence: result.confidence,
                classifiedBy: 'rules',
              },
            })
          )
          processedCount += original.allIds.length
        }

        await Promise.all(updates)

        await prisma.uploadBatch.update({
          where: { id: batchId },
          data: { processedRows: processedCount },
        })
      }
    }

    await prisma.uploadBatch.update({
      where: { id: batchId },
      data: { status: 'complete', processedRows: transactions.length },
    })
  } catch (err) {
    await prisma.uploadBatch.update({
      where: { id: batchId },
      data: {
        status: 'failed',
        errors: JSON.stringify([err instanceof Error ? err.message : 'Classification failed']),
      },
    })
  }
}
