import { callOpenAI } from '../../shared/openai.service.js'
import { agent2SystemPrompt, buildAgent2UserPrompt } from './testsuite.prompt.js'

/**
 * Runs Agent 2 to generate test suite from requirement analysis JSON.
 * 
 * @param {object} params
 * @param {string} params.requirementId
 * @param {object} params.requirementJson
 * @returns {Promise<object>} Generated test suite JSON.
 */
export async function runAgent2({ requirementId, requirementJson }) {
  console.log("Hello from run agent 2");
  const userPrompt = buildAgent2UserPrompt({ requirementId, requirementJson })
  console.log("Hello from run agent 2 again");

  return await callOpenAI({
    systemPrompt: agent2SystemPrompt,
    userPrompt,
    temperature: 0.2,
    jsonMode: true
  })
}
