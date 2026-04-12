import type { CategoryItem, ClassificationResult } from '@/types'
import { nanoid } from 'nanoid'

type Pattern = string | RegExp

type Rule = {
  categoryName: string
  confidence: number
  patterns: Pattern[]
}

function normalizeForMatch(input: string): string {
  return input
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function matchAny(text: string, patterns: Pattern[]): boolean {
  for (const p of patterns) {
    if (typeof p === 'string') {
      if (text.includes(p)) return true
    } else {
      if (p.test(text)) return true
    }
  }
  return false
}

function resolveCategoryIdByName(categories: CategoryItem[], name: string): string | null {
  const exact = categories.find(c => c.name === name)
  if (exact) return exact.id

  const lower = name.toLowerCase()
  const ci = categories.find(c => c.name.toLowerCase() === lower)
  return ci?.id ?? null
}

function buildRules(): Rule[] {
  // NOTE: Keep these in priority order; first match wins.
  return [
    {
      categoryName: 'Salaries',
      confidence: 0.95,
      patterns: [
        // English
        'salary',
        'payroll',
        // Hebrew
        'משכורת',
        'שכר',
      ],
    },
    {
      categoryName: 'Transfers',
      confidence: 0.95,
      patterns: [
        // English
        'transfer',
        'bank transfer',
        'internal transfer',
        'wire',
        'ach',
        // Hebrew (generic)
        'העברה',
        'העברה בנקאית',
        'העברה פנימית',
        'בין חשבונות',
        'מחשבון',
        'לחשבון',
        'זיכוי העברה',
        'העברת',
        'הועבר',
      ],
    },
    {
      categoryName: 'Credit Card',
      confidence: 0.9,
      patterns: [
        // Brands / issuers
        'isracard',
        'ישראכרט',
        'cal',
        'כאל',
        'max',
        'מקס',
        // Generic
        'credit card',
        'כרטיס אשראי',
        'חיוב כרטיס',
      ],
    },
    {
      categoryName: 'Interest / Bank Fees',
      confidence: 0.85,
      patterns: [
        'fee',
        'fees',
        'commission',
        'interest',
        // Hebrew
        'עמלה',
        'עמלות',
        'ריבית',
      ],
    },
    {
      categoryName: 'Food & Dining',
      confidence: 0.8,
      patterns: [
        'restaurant',
        'cafe',
        'coffee',
        'food',
        'wolt',
        'tenbis',
        // Hebrew
        'מסעדה',
        'קפה',
        'אוכל',
      ],
    },
    {
      categoryName: 'Transport',
      confidence: 0.8,
      patterns: [
        'uber',
        'lyft',
        'taxi',
        'train',
        'bus',
        // Israel-specific
        'rav kav',
        'רב-קו',
        'רב קו',
        // Hebrew
        'מונית',
        'אוטובוס',
        'רכבת',
      ],
    },
    {
      categoryName: 'Utilities',
      confidence: 0.75,
      patterns: [
        'electric',
        'electricity',
        'water',
        'gas',
        'internet',
        // Hebrew
        'חשמל',
        'מים',
        'גז',
        'אינטרנט',
      ],
    },
    {
      categoryName: 'Rent / Mortgage',
      confidence: 0.75,
      patterns: [
        'rent',
        'mortgage',
        // Hebrew
        'שכירות',
        'משכנתא',
      ],
    },
    {
      categoryName: 'SaaS Services',
      confidence: 0.75,
      patterns: [
        'google',
        'gcp',
        'aws',
        'amazon web services',
        'microsoft',
        'azure',
        'github',
        'slack',
        'notion',
        'figma',
        'jira',
        'atlassian',
        'stripe',
        // Hebrew
        'פיתוח',
        'פיתוח תוכנה',
        'פיתוח אפליקציה',
        'פיתוח מערכת',
        'פיתוח מערכת תוכנה',
        'פיתוח מערכת אפליקציה',
        'פיתוח מערכת מחשבית',
        'פיתוח מערכת מחשבית',
      ],
    },
  ]
}

export function classifyDescriptionToCategoryName(input: { description: string }): string | null {
  const text = normalizeForMatch(input.description)
  for (const rule of buildRules()) {
    if (matchAny(text, rule.patterns.map(p => (typeof p === 'string' ? p.toLowerCase() : p)))) {
      return rule.categoryName
    }
  }
  return null
}

export function keywordClassifyBatch(
  categories: CategoryItem[],
  transactions: Array<{ id: string; description: string }>
): ClassificationResult[] {
  const rules = buildRules()
  const fallbackCategoryId =
    resolveCategoryIdByName(categories, 'Other Expenses') ??
    categories[categories.length - 1]?.id

  return transactions.map(t => {
    const text = normalizeForMatch(t.description)
    for (const rule of rules) {
      if (!matchAny(text, rule.patterns.map(p => (typeof p === 'string' ? p.toLowerCase() : p)))) continue
      const categoryId = resolveCategoryIdByName(categories, rule.categoryName) ?? fallbackCategoryId
      return { id: t.id, categoryId: categoryId ?? '', confidence: rule.confidence }
    }
    return { id: t.id, categoryId: fallbackCategoryId ?? '', confidence: 0.5 }
  })
}

export function ensureDefaultCategory(
  categories: CategoryItem[],
  input: { name: string; type: string; color: string; sortOrder: number }
): { categories: CategoryItem[]; created: CategoryItem | null } {
  const existingId = resolveCategoryIdByName(categories, input.name)
  if (existingId) return { categories, created: null }

  const created: CategoryItem = {
    id: nanoid(),
    userId: null,
    name: input.name,
    color: input.color,
    type: input.type,
    isDefault: true,
    sortOrder: input.sortOrder,
    createdAt: new Date().toISOString(),
  }

  return { categories: [...categories, created], created }
}

