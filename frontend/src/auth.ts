import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import axios from 'axios'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { type: 'text' },
        email: { type: 'email' },
        password: { type: 'password' },
        action: { type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials) return null

        try {
          const isSignup = credentials.action === 'signup'
          const url = isSignup 
            ? 'http://localhost:5000/api/auth/register' 
            : 'http://localhost:5000/api/auth/login'

          const payload = isSignup
            ? { username: credentials.username, email: credentials.email, password: credentials.password }
            : { email: credentials.email, password: credentials.password }

          const response = await axios.post(url, payload)

          if (response.data?.success && response.data?.data) {
            const { token, user } = response.data.data
            return {
              id: user.id,
              name: user.username,
              email: user.email,
              accessToken: token
            }
          }
          return null
        } catch (error: any) {
          const errorMessage = error?.response?.data?.error || error?.message || 'Authentication failed.'
          throw new Error(errorMessage)
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.accessToken = (user as any).accessToken
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        const anySession = session as any
        anySession.user = {
          name: token.name as string,
          email: token.email as string
        }
        anySession.user.id = token.id as string
        anySession.accessToken = token.accessToken
      }
      return session
    }
  },
  pages: {
    signIn: '/',
    error: '/'
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60
  },
  secret: process.env.NEXTAUTH_SECRET || 'supersecretnextauthsecretkeyforlocalsession'
}
