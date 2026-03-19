import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './prisma'
import { authConfig } from '@/auth.config'

const DEV_USER_ID = 'dev-user'
const DEV_USER_EMAIL = 'dev@test.com'
const DEV_USER_NAME = 'Dev User'

function isDevAuthBypassEnabled() {
  const enabled = process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production'
  return enabled
}

async function authorizeDevUser() {
  const user = await prisma.user.upsert({
    where: { email: DEV_USER_EMAIL },
    update: { name: DEV_USER_NAME },
    create: {
      id: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      name: DEV_USER_NAME,
    },
  })

  return { id: user.id, name: user.name, email: user.email }
}

function getAuthProviders() {
  if (isDevAuthBypassEnabled()) {
    return [
      Credentials({
        name: 'Dev Login',
        credentials: {},
        authorize: authorizeDevUser,
      }),
    ]
  }

  return [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ]
}

const nextAuthResult = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: getAuthProviders(),
  session: { strategy: 'jwt' },
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
})

export const { handlers, auth, signIn, signOut } = nextAuthResult
