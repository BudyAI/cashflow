const { PrismaClient } = require('@prisma/client')
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
const { nanoid } = require('nanoid')

const url = process.env.DATABASE_URL || 'file:./dev.db'
const adapter = new PrismaBetterSqlite3({ url })
const prisma = new PrismaClient({ adapter })

const defaults = [
  { name: 'Income', type: 'income', color: '#22c55e', sortOrder: 1 },
  { name: 'Salaries', type: 'expense', color: '#ef4444', sortOrder: 2 },
  { name: 'Subcontractors', type: 'expense', color: '#f97316', sortOrder: 3 },
  { name: 'SaaS Services', type: 'expense', color: '#8b5cf6', sortOrder: 4 },
  { name: 'Credit Card', type: 'expense', color: '#ec4899', sortOrder: 5 },
  { name: 'Interest / Bank Fees', type: 'expense', color: '#06b6d4', sortOrder: 6 },
  { name: 'Other Expenses', type: 'expense', color: '#94a3b8', sortOrder: 7 },
]

async function main() {
  for (const cat of defaults) {
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
      console.log(`Created category: ${cat.name}`)
    } else {
      console.log(`Category already exists: ${cat.name}`)
    }
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
