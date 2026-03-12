import { prisma } from '@/lib/prisma'
import type { CategoryItem } from '@/types'

export async function buildClassificationPrompt(
  userId: string,
  categories: CategoryItem[],
  transactions: Array<{ id: string; description: string; amount: number }>
): Promise<string> {
  // Fetch recent corrections for few-shot examples
  const history = await prisma.classificationHistory.findMany({
    where: { userId },
    orderBy: { correctedAt: 'desc' },
    take: 15,
    distinct: ['descriptionNormalized'],
  })

  const categoryList = categories
    .map(c => `- ${c.id}: ${c.name} (${c.type})`)
    .join('\n')

  const fewShotExamples =
    history.length > 0
      ? `\nPrevious user corrections (learn from these):\n${history
          .map(
            h =>
              `- "${h.descriptionOriginal}" (${h.amount > 0 ? '+' : ''}${h.amount}) → ${h.correctedCategoryName}`
          )
          .join('\n')}`
      : ''

  const transactionList = transactions
    .map(t => `{"id":"${t.id}","desc":"${t.description}","amount":${t.amount}}`)
    .join('\n')

  const categoryIds = categories.map(c => c.id).join(', ')

  const prompt = `You are a financial transaction classifier for an accounting application.

Available categories:
${categoryList}
${fewShotExamples}

Classify each transaction below into one of the category IDs listed above.
Return ONLY a valid JSON array, no other text:
[{"id":"<transactionId>","categoryId":"<categoryId>","confidence":<0.0-1.0>}, ...]

Valid categoryIds: ${categoryIds}

Transactions to classify:
${transactionList}`

  // Update usage counts for history items used
  if (history.length > 0) {
    await prisma.classificationHistory.updateMany({
      where: { id: { in: history.map(h => h.id) } },
      data: { usedInPromptCount: { increment: 1 } },
    })
  }

  return prompt
}
