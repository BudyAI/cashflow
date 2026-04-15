import type { CategoryItem, ClassificationResult } from '@/types'

export type KeywordRule = {
  categoryId: string
  normalizedKeyword: string
  confidence: number
}

export function normalizeForMatch(input: string): string {
  return input
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function resolveCategoryIdByName(categories: CategoryItem[], name: string): string | null {
  const exact = categories.find(c => c.name === name)
  if (exact) return exact.id

  const lower = name.toLowerCase()
  const ci = categories.find(c => c.name.toLowerCase() === lower)
  return ci?.id ?? null
}

function getOrderedRules(rules: KeywordRule[]): KeywordRule[] {
  return [...rules].sort((a, b) => {
    const byKeywordLength = b.normalizedKeyword.length - a.normalizedKeyword.length
    if (byKeywordLength !== 0) return byKeywordLength
    return b.confidence - a.confidence
  })
}

export function classifyDescriptionToCategoryName(
  input: { description: string },
  rules: KeywordRule[],
  categories: CategoryItem[]
): string | null {
  const orderedRules = getOrderedRules(rules)
  const text = normalizeForMatch(input.description)
  for (const rule of orderedRules) {
    if (text.includes(rule.normalizedKeyword)) {
      return categories.find(category => category.id === rule.categoryId)?.name ?? null
    }
  }
  return null
}

export function keywordClassifyBatch(
  categories: CategoryItem[],
  transactions: Array<{ id: string; description: string }>,
  rules: KeywordRule[]
): ClassificationResult[] {
  const orderedRules = getOrderedRules(rules)
  const fallbackCategoryId =
    resolveCategoryIdByName(categories, 'Other Expenses') ??
    categories[categories.length - 1]?.id

  return transactions.map(t => {
    const text = normalizeForMatch(t.description)
    for (const rule of orderedRules) {
      if (!text.includes(rule.normalizedKeyword)) continue
      return { id: t.id, categoryId: rule.categoryId, confidence: rule.confidence }
    }
    return { id: t.id, categoryId: fallbackCategoryId ?? '', confidence: 0.5 }
  })
}

