import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { buildClassificationPrompt } from './prompt-builder'
import type { CategoryItem, ClassificationResult } from '@/types'

const anthropic = new Anthropic()

function normalizeDescriptionForDedupe(input: string): string {
  return input
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

type AnthropicModelInfo = { id: string; display_name?: string }

let resolvedAnthropicModel: string | null = null
async function resolveAnthropicModel(): Promise<string> {
  const fromEnv = process.env.ANTHROPIC_MODEL?.trim()
  if (fromEnv) return fromEnv
  if (resolvedAnthropicModel) return resolvedAnthropicModel

  // Fall back to asking Anthropic what models are available for this key.
  // The docs recommend using GET /v1/models to determine availability.
  const list = await anthropic.models.list({ limit: 100 })
  const models = (list.data ?? []) as unknown as AnthropicModelInfo[]

  const pick =
    models.find(m => (m.display_name ?? '').toLowerCase().includes('sonnet')) ??
    models.find(m => (m.id ?? '').toLowerCase().includes('sonnet')) ??
    models[0]

  if (!pick?.id) throw new Error('No Anthropic models available for this API key')
  resolvedAnthropicModel = pick.id
  return pick.id
}

function createLimit(concurrency: number) {
  let active = 0
  const queue: Array<() => void> = []

  function next() {
    if (active >= concurrency || queue.length === 0) return
    active++
    const fn = queue.shift()!
    fn()
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--
            next()
          })
      })
      next()
    })
  }
}

async function classifyBatch(
  userId: string,
  categories: CategoryItem[],
  transactions: Array<{ id: string; description: string }>,
  fallbackCategoryId: string
): Promise<ClassificationResult[]> {
  const prompt = await buildClassificationPrompt(userId, categories, transactions)

  let message: Awaited<ReturnType<typeof anthropic.messages.create>>
  let modelId: string
  try {
    modelId = await resolveAnthropicModel()
  } catch (err) {
    throw err
  }

  try {
    message = await anthropic.messages.create({
      model: modelId,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
  } catch (err) {
    throw err
  }

  const content = message.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type')

  // Extract JSON array from response
  const jsonMatch = content.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error('No JSON array in response')

  let results: ClassificationResult[]
  try {
    results = JSON.parse(jsonMatch[0]) as ClassificationResult[]
  } catch (err) {
    throw err
  }

  // Validate each result has required fields
  const validCategoryIds = new Set(categories.map(c => c.id))
  const normalized = results.map(r => ({
    id: r.id,
    categoryId: validCategoryIds.has(r.categoryId) ? r.categoryId : fallbackCategoryId,
    confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0.5,
  }))

  return normalized
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
        data: { categoryId: incomeCategory.id, categoryConfidence: 1, classifiedBy: 'claude' },
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

      // Process with createLimit(5) concurrent calls
      const limit = createLimit(5)
      let processedCount = creditTxs.length

      const tasks = chunks.map(chunk =>
        limit(async () => {
          const results = await classifyBatch(
            userId,
            categories,
            chunk.map((t: TxLite) => ({
              id: t.id,
              description: t.description,
            })),
            fallbackCategory.id
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
                  classifiedBy: 'claude',
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
        })
      )

      await Promise.all(tasks)
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
