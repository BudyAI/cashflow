import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PLACEHOLDER = 'generate_with_openssl_rand_base64_32'
const root = process.cwd()
const envPath = join(root, '.env')
const examplePath = join(root, '.env.example')

function generateSecret() {
  return randomBytes(32).toString('base64')
}

function parseNextAuthLine(line) {
  const m = line.match(/^NEXTAUTH_SECRET=(.*)$/)
  if (!m) return { hasKey: false, value: '' }
  let v = m[1].trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1)
  }
  return { hasKey: true, value: v }
}

function needsNewSecret(content) {
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (line.startsWith('NEXTAUTH_SECRET=')) {
      const { value } = parseNextAuthLine(line)
      if (!value || value === PLACEHOLDER) return true
      return false
    }
  }
  return true
}

function injectOrReplaceSecret(content, secret) {
  const line = `NEXTAUTH_SECRET=${secret}`
  if (/^NEXTAUTH_SECRET=/m.test(content)) {
    return content.replace(/^NEXTAUTH_SECRET=.*$/m, line)
  }
  const trimmed = content.replace(/\s*$/, '')
  const prefix = trimmed.length ? `${trimmed}\n` : ''
  return `${prefix}${line}\n`
}

function main() {
  const secret = generateSecret()

  if (!existsSync(examplePath)) {
    console.error('Missing .env.example; cannot create .env.')
    process.exit(1)
  }

  if (!existsSync(envPath)) {
    let content = readFileSync(examplePath, 'utf8')
    content = injectOrReplaceSecret(content, secret)
    writeFileSync(envPath, content, 'utf8')
    console.log('Created .env from .env.example with a random NEXTAUTH_SECRET.')
    return
  }

  const content = readFileSync(envPath, 'utf8')
  if (!needsNewSecret(content)) {
    console.log('.env already has NEXTAUTH_SECRET set; leaving unchanged.')
    return
  }

  const next = injectOrReplaceSecret(content, secret)
  writeFileSync(envPath, next, 'utf8')
  console.log('Updated .env with a random NEXTAUTH_SECRET.')
}

main()
