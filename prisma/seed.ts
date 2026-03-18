import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { nanoid } from 'nanoid'

function getPrisma() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Set it in .env to run the seed.')
  }
  const adapter = new PrismaPg({ connectionString })
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
  { name: 'Interest / Bank Fees', type: 'expense', color: '#06b6d4', sortOrder: 6 },
  { name: 'Food & Dining', type: 'expense', color: '#eab308', sortOrder: 7 },
  { name: 'Transport', type: 'expense', color: '#0ea5e9', sortOrder: 8 },
  { name: 'Utilities', type: 'expense', color: '#84cc16', sortOrder: 9 },
  { name: 'Rent / Mortgage', type: 'expense', color: '#a855f7', sortOrder: 10 },
  { name: 'Other Expenses', type: 'expense', color: '#94a3b8', sortOrder: 99 },
]

async function main() {
  for (const cat of GENERAL_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, userId: null },
    })
    if (!existing) {
      await prisma.category.create({
        data: {
          id: nanoid(),
          userId: null,
          name: cat.name,
          color: cat.color,
          type: cat.type,
          isDefault: true,
          sortOrder: cat.sortOrder,
        },
      })
      console.log(`Created general category: ${cat.name}`)
    } else {
      console.log(`General category already exists: ${cat.name}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
