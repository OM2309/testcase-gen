import { callOpenAI } from './openai.service.js'
import { agent2SystemPrompt, buildAgent2UserPrompt } from '../prompts/agent2.prompt.js'

/**
 * Runs Agent 2 to generate test suite from requirement analysis JSON.
 * 
 * @param {object} params
 * @param {string} params.requirementId
 * @param {object} params.requirementJson
 * @returns {Promise<object>} Generated test suite JSON.
 */
export async function runAgent2({ requirementId, requirementJson }) {
  const userPrompt = buildAgent2UserPrompt({ requirementId, requirementJson })

  return await callOpenAI({
    systemPrompt: agent2SystemPrompt,
    userPrompt,
    temperature: 0.2,
    jsonMode: true
  })
}
