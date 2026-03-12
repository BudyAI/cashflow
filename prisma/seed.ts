import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'
import path from 'path'
import { nanoid } from 'nanoid'

const url = process.env.DATABASE_URL ?? 'file:./dev.db'
const filePath = url.replace(/^file:/, '')
const dbPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
const db = new Database(dbPath)
const adapter = new PrismaBetterSqlite3(db)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const defaults = [
    { name: 'Income', type: 'income', color: '#22c55e', sortOrder: 1 },
    { name: 'Salaries', type: 'expense', color: '#ef4444', sortOrder: 2 },
    { name: 'Subcontractors', type: 'expense', color: '#f97316', sortOrder: 3 },
    { name: 'SaaS Services', type: 'expense', color: '#8b5cf6', sortOrder: 4 },
    { name: 'Credit Card', type: 'expense', color: '#ec4899', sortOrder: 5 },
    { name: 'Interest / Bank Fees', type: 'expense', color: '#06b6d4', sortOrder: 6 },
    { name: 'Other Expenses', type: 'expense', color: '#94a3b8', sortOrder: 7 },
  ]

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
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
