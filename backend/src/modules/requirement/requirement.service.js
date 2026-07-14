import { callOpenAI } from '../../shared/openai.service.js'
import { 
  agent1SystemPrompt, 
  buildAgent1UserPrompt,
  agent0SystemPrompt,
  buildAgent0UserPrompt,
  agent3GapFillSystemPrompt,
  buildAgent3GapFillUserPrompt
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
 * @returns {Promise<object>} The SRS rating JSON with structured feedback.
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

/**
 * Runs Agent 3 Gap-Fill analysis to auto-fill incomplete SRS details
 * and suggest test cases for each gap.
 * 
 * @param {object} params
 * @param {string} params.documentName
 * @param {string} params.documentText
 * @param {string[]} params.missingDetails
 * @param {string[]} params.ambiguities
 * @returns {Promise<object>} The gap-fill JSON with filled_gaps array.
 */
export async function runAgent3GapFill({ documentName, documentText, missingDetails, ambiguities }) {
  const userPrompt = buildAgent3GapFillUserPrompt({ documentName, documentText, missingDetails, ambiguities })

  return await callOpenAI({
    systemPrompt: agent3GapFillSystemPrompt,
    userPrompt,
    temperature: 0.3,
    jsonMode: true
  })
}

