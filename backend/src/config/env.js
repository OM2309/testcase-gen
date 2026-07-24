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
  slackClientId: process.env.slackClientId || process.env.SLACK_CLIENT_ID,
  slackClientSecret: process.env.slackClientSecret || process.env.SLACK_CLIENT_SECRET,
  slackSigningSecret: process.env.slackSigningSecret || process.env.SLACK_SIGNING_SECRET,
  slackRedirectUri: process.env.slackRedirectUri || process.env.SLACK_REDIRECT_URI,
  slackBotToken: process.env.SLACK_BOT_TOKEN || process.env.slackBotToken || process.env.SLACK_ACCESS_TOKEN || '',
  figmaAccessToken: process.env.FIGMA_ACCESS_TOKEN || ''
}

// Simple validation
if (!env.openaiApiKey) {
  console.warn('[WARNING] OPENAI_API_KEY is not defined in environment variables.')
}

export default env
