import { callOpenAI } from './openai.service.js'
import { agent1SystemPrompt, buildAgent1UserPrompt } from '../prompts/agent1.prompt.js'

/**
 * Runs Agent 1 analysis on PRD/SRS text.
 * 
 * @param {object} params
 * @param {string} params.documentName
 * @param {string} params.documentText
 * @returns {Promise<object>} The requirement analysis JSON.
 */
export async function runAgent1({ documentName, documentText }) {
  const userPrompt = buildAgent1UserPrompt({ documentName, documentText })

  return await callOpenAI({
    systemPrompt: agent1SystemPrompt,
    userPrompt,
    temperature: 0.1,
    jsonMode: true
  })
}
