import { callOpenAI } from './openai.service.js'
import { agent1SystemPrompt, buildAgent1UserPrompt } from './prompts/agent1.prompt.js'

export async function runAgent1({ documentName, documentText }) {
  const userPrompt = buildAgent1UserPrompt({ documentName, documentText })

  const result = await callOpenAI({
    systemPrompt: agent1SystemPrompt,
    userPrompt,
    temperature: 0.1
  })

  return JSON.parse(result)
}
