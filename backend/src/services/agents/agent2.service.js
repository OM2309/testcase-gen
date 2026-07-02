import { callOpenAI } from '../ai/openai.service.js'
import { agent2SystemPrompt, buildAgent2UserPrompt } from './prompts/agent2.prompt.js'

export async function runAgent2({ requirementId, requirementJson }) {
  const userPrompt = buildAgent2UserPrompt({
    requirementId,
    requirementJson
  })

  const result = await callOpenAI({
    systemPrompt: agent2SystemPrompt,
    userPrompt,
    temperature: 0.2
  })

  return JSON.parse(result)
}
