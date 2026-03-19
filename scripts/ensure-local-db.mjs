import { spawnSync } from 'node:child_process'

function getDbProvider() {
  return process.env.DB_PROVIDER === 'postgresql' ? 'postgresql' : 'sqlite'
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function main() {
  const provider = getDbProvider()
  if (provider !== 'sqlite') {
    return
  }

  // Keep local SQLite schema in sync automatically for first run.
  runCommand('pnpm', ['prisma', 'db', 'push'])
}

main()
