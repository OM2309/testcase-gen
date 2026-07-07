import openai from '../config/openai.js'
import env from '../config/env.js'

/**
 * Calls OpenAI Chat Completions API.
 *
 * @param {object} params
 * @param {string} params.systemPrompt
 * @param {string} params.userPrompt
 * @param {number} [params.temperature]
 * @param {boolean} [params.jsonMode]
 * @returns {Promise<object|string>}
 */
export async function callOpenAI({
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  jsonMode = true
}) {
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
    console.log("response", response);
    const content = response?.choices?.[0]?.message?.content
    console.log("content", content);


    if (!content) {
      throw new Error('Empty response received from OpenAI')
    }

    if (jsonMode) {
      try {
        console.log("Inside json function");
        return JSON.parse(content)
      } catch (parseError) {
        console.error('[OPENAI SERVICE] Failed to parse JSON response')
        console.error('[OPENAI SERVICE] Raw content:', content)
        throw new Error(`Invalid JSON returned from OpenAI: ${parseError.message}`)
      }
    }

    return content;
  } catch (error) {
    console.error('[OPENAI SERVICE] Error during chat completion:', error)
    throw error
  }
}