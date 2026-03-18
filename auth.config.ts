import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

// Edge-compatible config — no Prisma, no Node.js-only modules
export const authConfig: NextAuthConfig = {
  providers: [Google],
  pages: { signIn: '/login' },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname.startsWith('/login')
      const isApiAuth = nextUrl.pathname.startsWith('/api/auth')

      if (isApiAuth) return true
      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL('/transactions', nextUrl))
        return true
      }
      return isLoggedIn
    },
  },
}
