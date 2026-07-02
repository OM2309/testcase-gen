import openai from '../config/openai.js'
import env from '../config/env.js'
import { extractJson } from '../utils/extractJson.js'

/**
 * Calls OpenAI Chat Completions API.
 * 
 * @param {object} params
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {number} [params.temperature]
 * @param {boolean} [params.jsonMode]
 * @returns {Promise<object>} Parsed JSON response.
 */
export async function callOpenAI({ systemPrompt, userPrompt, temperature = 0.2, jsonMode = true }) {
  const model = env.openaiModel || 'gpt-4o'
  
  const options = {
    model,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  }

  if (jsonMode) {
    options.response_format = { type: 'json_object' }
  }

  try {
    const response = await openai.chat.completions.create(options)
    const content = response.choices[0].message.content

    if (jsonMode) {
      return extractJson(content)
    }

    return content
  } catch (error) {
    console.error('[OPENAI SERVICE] Error during chat completion:', error)
    throw error
  }
}
