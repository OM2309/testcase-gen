import { callOpenAI } from '../../shared/openai.service.js'
import { 
  agent1SystemPrompt, 
  buildAgent1UserPrompt,
  agent0SystemPrompt,
  buildAgent0UserPrompt
} from './requirement.prompt.js'

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

/**
 * Runs Agent 0 analysis to rate PRD/SRS detailing out of 100.
 * 
 * @param {object} params
 * @param {string} params.documentName
 * @param {string} params.documentText
 * @returns {Promise<object>} The SRS rating JSON: { score: number, feedback: string }.
 */
export async function runAgent0({ documentName, documentText }) {
  const userPrompt = buildAgent0UserPrompt({ documentName, documentText })

  return await callOpenAI({
    systemPrompt: agent0SystemPrompt,
    userPrompt,
    temperature: 0.2,
    jsonMode: true
  })
}

