import { spawnSync } from 'node:child_process'

function getDbProvider() {
  if (process.env.DB_PROVIDER === 'postgresql') return 'postgresql'
  if (process.env.DB_PROVIDER === 'sqlite') return 'sqlite'
  return process.env.NODE_ENV === 'production' ? 'postgresql' : 'sqlite'
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

const provider = getDbProvider()
if (provider === 'postgresql') {
  run('node', ['scripts/run-prisma-postgres.mjs', 'generate'])
} else {
  run('pnpm', ['prisma', 'generate'])
}
