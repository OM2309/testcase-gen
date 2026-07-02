import openai from '../../config/openai.js'

export async function callOpenAI({ systemPrompt, userPrompt, temperature = 0.2 }) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  const response = await openai.chat.completions.create({
    model,
    temperature,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' }
  })

  return response.choices[0].message.content
}
