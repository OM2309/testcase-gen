import { callOpenAI } from '../../shared/openai.service.js'
import { 
  agent1SystemPrompt, 
  buildAgent1UserPrompt,
  agent0SystemPrompt,
  buildAgent0UserPrompt,
  agent3GapFillSystemPrompt,
  buildAgent3GapFillUserPrompt,
  agent1FigmaSystemPrompt,
  buildAgent1FigmaUserPrompt,
  agent1HybridSystemPrompt,
  buildAgent1HybridUserPrompt
} from './requirement.prompt.js'
import { ValidationError } from '../../errors/index.js'

/**
 * Validates whether the document text is meaningful SRS content.
 * 
 * @param {string} text 
 */
export function validateDocumentText(text) {
  if (!text || text.trim().length < 20) {
    throw new ValidationError('The uploaded document is too short to contain valid requirements.')
  }
  // Check if it has at least some English/alphabetical words
  const wordMatch = text.match(/[a-zA-Z]{3,}/g)
  if (!wordMatch || wordMatch.length < 5) {
    throw new ValidationError('The uploaded document does not contain readable words. Please upload a valid textual document.')
  }
}

/**
 * Call OpenAI with JSON validation and a retry-repair loop if parsing fails.
 */
async function callOpenAIWithRetry({ systemPrompt, userPrompt, temperature, jsonMode, image, validateFn, maxRetries = 1 }) {
  let currentAttempt = 0
  let lastError = null
  let activeUserPrompt = userPrompt

  while (currentAttempt <= maxRetries) {
    try {
      const result = await callOpenAI({
        systemPrompt,
        userPrompt: activeUserPrompt,
        temperature,
        jsonMode,
        image
      })

      if (validateFn) {
        validateFn(result)
      }
      return result
    } catch (err) {
      console.warn(`[Agent Guardrail] Attempt ${currentAttempt + 1} failed. Error: ${err.message}`)
      lastError = err
      currentAttempt++
      if (currentAttempt <= maxRetries) {
        activeUserPrompt = `${userPrompt}\n\n[REPAIR NOTICE] Your previous response failed validation with error: "${err.message}". Please fix it, ensure valid JSON structure, and return only the corrected JSON schema.`
      }
    }
  }
  throw new ValidationError(`Agent failed to generate a valid requirement structure: ${lastError.message}`)
}

/**
 * Runs Agent 1 analysis on PRD/SRS text.
 * 
 * @param {object} params
 * @param {string} params.documentName
 * @param {string} params.documentText
 * @returns {Promise<object>} The requirement analysis JSON.
 */
export async function runAgent1({ documentName, documentText }) {
  validateDocumentText(documentText)
  const userPrompt = buildAgent1UserPrompt({ documentName, documentText })

  return await callOpenAIWithRetry({
    systemPrompt: agent1SystemPrompt,
    userPrompt,
    temperature: 0.1,
    jsonMode: true,
    validateFn: (res) => {
      if (!res.modules || !Array.isArray(res.modules)) {
        throw new Error('Missing "modules" array in requirement JSON')
      }
    }
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
  validateDocumentText(documentText)
  const userPrompt = buildAgent0UserPrompt({ documentName, documentText })

  return await callOpenAIWithRetry({
    systemPrompt: agent0SystemPrompt,
    userPrompt,
    temperature: 0.2,
    jsonMode: true,
    validateFn: (res) => {
      if (typeof res.score !== 'number') {
        throw new Error('Missing numeric "score" field in rating JSON')
      }
    }
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
  validateDocumentText(documentText)
  const userPrompt = buildAgent3GapFillUserPrompt({ documentName, documentText, missingDetails, ambiguities })

  return await callOpenAIWithRetry({
    systemPrompt: agent3GapFillSystemPrompt,
    userPrompt,
    temperature: 0.3,
    jsonMode: true,
    validateFn: (res) => {
      if (!res.filled_gaps || !Array.isArray(res.filled_gaps)) {
        throw new Error('Missing "filled_gaps" array in response JSON')
      }
    }
  })
}

/**
 * Runs Figma design requirement extraction.
 */
export async function runAgent1Figma({ projectName, figmaParsedData, figmaImages }) {
  if (!figmaParsedData || figmaParsedData.length === 0) {
    throw new ValidationError('Figma screen data is empty.')
  }
  const userPrompt = buildAgent1FigmaUserPrompt({ projectName, figmaParsedData })

  return await callOpenAIWithRetry({
    systemPrompt: agent1FigmaSystemPrompt,
    userPrompt,
    temperature: 0.1,
    jsonMode: true,
    image: figmaImages && figmaImages.length > 0 ? figmaImages : null,
    validateFn: (res) => {
      if (!res.modules || !Array.isArray(res.modules)) {
        throw new Error('Missing "modules" array in figma-extracted requirement JSON')
      }
    }
  })
}

/**
 * Runs Hybrid SRS + Figma design requirement extraction.
 */
export async function runAgent1Hybrid({ projectName, documentName, documentText, figmaParsedData, figmaImages }) {
  validateDocumentText(documentText)
  if (!figmaParsedData || figmaParsedData.length === 0) {
    throw new ValidationError('Figma screen data is empty.')
  }
  const userPrompt = buildAgent1HybridUserPrompt({ documentName, documentText, figmaParsedData })

  return await callOpenAIWithRetry({
    systemPrompt: agent1HybridSystemPrompt,
    userPrompt,
    temperature: 0.1,
    jsonMode: true,
    image: figmaImages && figmaImages.length > 0 ? figmaImages : null,
    validateFn: (res) => {
      if (!res.modules || !Array.isArray(res.modules)) {
        throw new Error('Missing "modules" array in hybrid requirement JSON')
      }
    }
  })
}

