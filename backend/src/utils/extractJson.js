/**
 * Safely extracts and parses JSON content from a text block.
 * Handles markdown code block wrapper ```json ... ``` if present.
 * 
 * @param {string} text - The input text containing JSON.
 * @returns {object} The parsed JSON object.
 */
export function extractJson(text) {
  if (!text) {
    throw new Error('Input text is empty')
  }

  let cleaned = text.trim()

  // Remove markdown code block prefix/suffix if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '').trim()
  }

  try {
    return JSON.parse(cleaned)
  } catch (err) {
    console.error('Failed to parse JSON. Raw input:', text)
    throw new Error(`JSON parsing failed: ${err.message}`)
  }
}
