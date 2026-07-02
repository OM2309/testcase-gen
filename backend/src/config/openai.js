import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config({ override: true })

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'Accept-Encoding': 'identity'
  }
})

export default openai
