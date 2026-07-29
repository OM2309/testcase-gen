import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import axios from 'axios'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { type: 'text' },
        email: { type: 'email' },
        password: { type: 'password' },
        action: { type: 'text' },
        token: { type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials) return null

        try {
          const isGoogle = credentials.action === 'google'
          if (isGoogle) {
            const token = credentials.token
            if (!token) throw new Error('No token provided.')


            const response = await axios.get('http://localhost:5000/api/auth/me', {
              headers: { Authorization: `Bearer ${token}` }
            })

            if (response.data?.success && response.data?.data) {
              const user = response.data.data
              return {
                id: user.id,
                name: user.username,
                email: user.email,
                accessToken: token,
                role: user.role
              }
            }
            return null
          }

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
              accessToken: token,
              role: user.role
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
    async signIn() {
      return true
    },
    async jwt({ token, user, account, trigger, session }) {
      if (account?.provider === 'google' && user) {
        try {
          const response = await axios.post('http://localhost:5000/api/user/google-next', {
            email: user.email,
            username: user.name || user.email?.split('@')[0]
          })

          if (response.data?.success && response.data?.data) {
            const backendData = response.data.data
            token.id = backendData.user.id
            token.accessToken = backendData.token
            token.name = backendData.user.username
            token.role = backendData.user.role
          }
        } catch (err: any) {
          console.error('Google register in backend failed in JWT callback:', err?.response?.data || err.message)
        }
      } else if (user) {
        token.id = user.id
        token.accessToken = (user as any).accessToken
        token.name = user.name
        token.role = (user as any).role
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name
        if (session.role) token.role = session.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        const anySession = session as any
        anySession.user = {
          id: token.id as string,
          name: token.name as string,
          email: token.email as string,
          role: token.role as string
        }
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
