import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

type DbProvider = 'sqlite' | 'postgresql'

function getDbProvider(): DbProvider {
  return process.env.DB_PROVIDER === 'postgresql' ? 'postgresql' : 'sqlite'
}

function getConnectionString(provider: DbProvider): string {
  const envUrl = process.env.DATABASE_URL
  let connectionString: string

  if (provider === 'sqlite') {
    if (envUrl?.startsWith('file:')) {
      connectionString = envUrl
    } else {
      connectionString = 'file:./dev.db'
    }
  } else if (envUrl?.startsWith('postgresql://')) {
    connectionString = envUrl
  } else {
    connectionString = 'postgresql://localhost:5432/cashflow'
  }
  return connectionString
}

function createAdapter(connectionString: string, provider: DbProvider) {
  if (provider === 'postgresql') {
    return new PrismaPg({ connectionString })
  }
  return new PrismaBetterSqlite3({ url: connectionString })
}

function createPrismaClient() {
  const provider = getDbProvider()
  const connectionString = getConnectionString(provider)
  const adapter = createAdapter(connectionString, provider)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
