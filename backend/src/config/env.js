import dotenv from 'dotenv'
dotenv.config({ override: true })

const env = {
  port: process.env.PORT || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/testcasegen',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkeyforauth',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
  slackClientId: process.env.slackClientId,
  slackClientSecret: process.env.slackClientSecret,
  slackSigningSecret: process.env.slackSigningSecret,
  slackRedirectUri: process.env.slackRedirectUri,
  figmaAccessToken: process.env.FIGMA_ACCESS_TOKEN || ''
}

// Simple validation
if (!env.openaiApiKey) {
  console.warn('[WARNING] OPENAI_API_KEY is not defined in environment variables.')
}

export default env
