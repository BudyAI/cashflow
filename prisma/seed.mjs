import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaPg } from '@prisma/adapter-pg'
import crypto from 'crypto'

function getDbProvider() {
  return process.env.DB_PROVIDER === 'postgresql' ? 'postgresql' : 'sqlite'
}

function getConnectionString(provider) {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  return provider === 'postgresql'
    ? 'postgresql://localhost:5432/cashflow'
    : 'file:./dev.db'
}

function createAdapter(connectionString, provider) {
  if (provider === 'postgresql') {
    return new PrismaPg({ connectionString })
  }
  return new PrismaBetterSqlite3({ url: connectionString })
}

function getPrisma() {
  const provider = getDbProvider()
  const connectionString = getConnectionString(provider)
  const adapter = createAdapter(connectionString, provider)
  return new PrismaClient({ adapter })
}

const prisma = getPrisma()

/** General categories for all users (userId: null). Seeded once, visible to everyone. */
const GENERAL_CATEGORIES = [
  { name: 'Income', type: 'income', color: '#22c55e', sortOrder: 1 },
  { name: 'Salaries', type: 'expense', color: '#ef4444', sortOrder: 2 },
  { name: 'Subcontractors', type: 'expense', color: '#f97316', sortOrder: 3 },
  { name: 'SaaS Services', type: 'expense', color: '#8b5cf6', sortOrder: 4 },
  { name: 'Credit Card', type: 'expense', color: '#ec4899', sortOrder: 5 },
  { name: 'Transfers', type: 'expense', color: '#a3a3a3', sortOrder: 5 },
  { name: 'Interest / Bank Fees', type: 'expense', color: '#06b6d4', sortOrder: 6 },
  { name: 'Food & Dining', type: 'expense', color: '#eab308', sortOrder: 7 },
  { name: 'Transport', type: 'expense', color: '#0ea5e9', sortOrder: 8 },
  { name: 'Utilities', type: 'expense', color: '#84cc16', sortOrder: 9 },
  { name: 'Other Expenses', type: 'expense', color: '#94a3b8', sortOrder: 99 },
]

const DEFAULT_KEYWORD_RULES = [
  { categoryName: 'Salaries', confidence: 0.95, keywords: ['salary', 'payroll', 'משכורת', 'שכר'] },
  {
    categoryName: 'Transfers',
    confidence: 0.95,
    keywords: [
      'transfer',
      'bank transfer',
      'internal transfer',
      'wire',
      'ach',
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
    keywords: ['isracard', 'ישראכרט', 'cal', 'כאל', 'max', 'מקס', 'credit card', 'כרטיס אשראי', 'חיוב כרטיס'],
  },
  { categoryName: 'Interest / Bank Fees', confidence: 0.85, keywords: ['fee', 'fees', 'commission', 'interest', 'עמלה', 'עמלות', 'ריבית'] },
  { categoryName: 'Food & Dining', confidence: 0.8, keywords: ['restaurant', 'cafe', 'coffee', 'food', 'wolt', 'tenbis', 'מסעדה', 'קפה', 'אוכל'] },
  {
    categoryName: 'Transport',
    confidence: 0.8,
    keywords: ['uber', 'lyft', 'taxi', 'train', 'bus', 'rav kav', 'רב-קו', 'רב קו', 'מונית', 'אוטובוס', 'רכבת'],
  },
  { categoryName: 'Utilities', confidence: 0.75, keywords: ['electric', 'electricity', 'water', 'gas', 'internet', 'חשמל', 'מים', 'גז', 'אינטרנט'] },
  {
    categoryName: 'SaaS Services',
    confidence: 0.75,
    keywords: [
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
      'פיתוח',
      'פיתוח תוכנה',
      'פיתוח אפליקציה',
      'פיתוח מערכת',
      'פיתוח מערכת תוכנה',
      'פיתוח מערכת אפליקציה',
      'פיתוח מערכת מחשבית',
    ],
  },
]

function normalizeKeyword(input) {
  return input.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
}

async function main() {
  const categoryByName = new Map()
  for (const cat of GENERAL_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, userId: null },
    })
    if (!existing) {
      const created = await prisma.category.create({
        data: {
          id: crypto.randomUUID(),
          userId: null,
          name: cat.name,
          color: cat.color,
          type: cat.type,
          isDefault: true,
          sortOrder: cat.sortOrder,
        },
      })
      categoryByName.set(created.name, created)
      console.log('Created general category: ' + cat.name)
    } else {
      categoryByName.set(existing.name, existing)
      console.log('General category already exists: ' + cat.name)
    }
  }

  for (const rule of DEFAULT_KEYWORD_RULES) {
    const category = categoryByName.get(rule.categoryName)
    if (!category) continue

    for (const keyword of rule.keywords) {
      const normalizedKeyword = normalizeKeyword(keyword)
      const existing = await prisma.categoryKeyword.findFirst({
        where: {
          userId: null,
          categoryId: category.id,
          normalizedKeyword,
        },
      })

      if (existing) continue

      await prisma.categoryKeyword.create({
        data: {
          id: crypto.randomUUID(),
          userId: null,
          categoryId: category.id,
          keyword: keyword.trim(),
          normalizedKeyword,
          confidence: rule.confidence,
        },
      })
      console.log(`Created default keyword "${keyword}" for ${rule.categoryName}`)
    }
  }
}

try {
  await main()
} catch (e) {
  console.error(e)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
