import { prisma } from '@/lib/prisma'
import type { CategoryItem } from '@/types'

export async function buildClassificationPrompt(
  userId: string,
  categories: CategoryItem[],
  transactions: Array<{ id: string; description: string }>
): Promise<string> {
  // Fetch recent corrections for few-shot examples
  const history = await prisma.classificationHistory.findMany({
    where: { userId },
    orderBy: { correctedAt: 'desc' },
    take: 15,
    distinct: ['descriptionNormalized'],
  })

  const categoriesPayload = categories.map(c => ({ id: c.id, name: c.name, type: c.type }))

  const fewShotExamples =
    history.length > 0
      ? `\n\nNotes for learning (previous user corrections):\n${history
          .map(
            (h: { descriptionOriginal: string; amount: number; correctedCategoryName: string }) =>
              `- "${h.descriptionOriginal}" (${h.amount > 0 ? '+' : ''}${h.amount}) → ${h.correctedCategoryName}`
          )
          .join('\n')}`
      : ''

  const inputPayload = {
    categories: categoriesPayload,
    transactions,
  }

  const prompt = `You are a financial transaction classifier for an accounting application.
Descriptions may be in Hebrew, English, or mixed. Do not translate them; classify based on meaning and context.
You will receive ONE JSON object containing:
- categories: array of {id, name, type}
- transactions: array of {id, description}

Rules:
- Return ONLY a valid JSON array (no prose, no markdown, no code fences).
- Output must be one item per input transaction id.
- categoryId MUST be one of the provided category ids.

Output schema:
[{"id":"<transactionId>","categoryId":"<categoryId>","confidence":<0.0-1.0>}, ...]

Input JSON:
${JSON.stringify(inputPayload)}${fewShotExamples}`

  // Update usage counts for history items used
  if (history.length > 0) {
    await prisma.classificationHistory.updateMany({
      where: {
        id: {
          in: history.map((h: { id: string }) => h.id),
        },
      },
      data: { usedInPromptCount: { increment: 1 } },
    })
  }

  return prompt
}
