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
  jsonMode = true,
  image = null
}) {
  const model = env.openaiModel || 'gpt-4o'

  let userMessageContent = userPrompt
  if (image) {
    userMessageContent = [{ type: 'text', text: userPrompt }]
    const images = Array.isArray(image) ? image : [image]
    for (const imgUrl of images) {
      if (imgUrl) {
        userMessageContent.push({
          type: 'image_url',
          image_url: {
            url: imgUrl
          }
        })
      }
    }
  }

  const options = {
    model,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessageContent }
    ]
  }

  if (jsonMode) {
    options.response_format = { type: 'json_object' }
  }

  try {
    const response = await openai.chat.completions.create(options)

    const content = response?.choices?.[0]?.message?.content


    if (!content) {
      throw new Error('Empty response received from OpenAI')
    }

    if (jsonMode) {
      try {
        return JSON.parse(content)
      } catch (parseError) {
        throw new Error(`Invalid JSON returned from OpenAI: ${parseError.message}`)
      }
    }

    return content;
  } catch (error) {
    console.error('[OPENAI SERVICE] Error during chat completion:', error)
    throw error
  }
}