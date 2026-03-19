import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const workspaceRoot = process.cwd()
const sourceSchemaPath = resolve(workspaceRoot, 'prisma/schema.prisma')
const tempSchemaPath = resolve(workspaceRoot, 'prisma/.schema.postgresql.prisma')

function buildPostgresSchema() {
  const source = readFileSync(sourceSchemaPath, 'utf8')
  return source.replace('provider = "sqlite"', 'provider = "postgresql"')
}

function runPrismaWithPostgresSchema(args) {
  const schema = buildPostgresSchema()
  writeFileSync(tempSchemaPath, schema, 'utf8')

  const result = spawnSync('pnpm', ['prisma', ...args, '--schema', tempSchemaPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      DB_PROVIDER: 'postgresql',
    },
  })

  rmSync(tempSchemaPath, { force: true })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

runPrismaWithPostgresSchema(process.argv.slice(2))
