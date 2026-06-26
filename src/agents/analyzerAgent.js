import { Agent, run } from '@openai/agents'
import { parseJsonSafe } from '../utils/sanitizer.js'

const ANALYZER_INSTRUCTIONS = `You are an expert Business Analyst and Requirements Engineer specializing in software requirement analysis.

Your job is to deeply analyze a Software Requirements Specification (SRS) document and extract ALL structured information needed for test case generation.

EXTRACT AND RETURN THE FOLLOWING IN VALID JSON FORMAT ONLY. NO PREAMBLE. NO MARKDOWN. JUST RAW JSON.

{
  "projectName": "string",
  "projectDescription": "string",
  "modules": [
    {
      "moduleId": "string — e.g. MOD-001",
      "moduleName": "string",
      "description": "string"
    }
  ],
  "functionalRequirements": [
    {
      "requirementId": "string — e.g. FR-001",
      "moduleId": "string",
      "title": "string",
      "description": "string",
      "actors": ["string"],
      "preconditions": ["string"],
      "postconditions": ["string"],
      "inputs": ["string"],
      "outputs": ["string"],
      "businessRules": ["string"],
      "priority": "High | Medium | Low"
    }
  ],
  "nonFunctionalRequirements": [
    {
      "requirementId": "string — e.g. NFR-001",
      "type": "string — Performance | Security | Usability | Scalability | Reliability",
      "description": "string",
      "acceptanceCriteria": "string"
    }
  ],
  "userRoles": ["string"],
  "assumptions": ["string"],
  "constraints": ["string"],
  "missingOrAmbiguousRequirements": [
    {
      "area": "string",
      "issue": "string",
      "suggestion": "string"
    }
  ],
  "inferredBusinessLogic": [
    {
      "moduleId": "string",
      "logic": "string"
    }
  ]
}

RULES:
- Return ONLY the raw JSON object. No markdown. No explanation. No code blocks.
- If a section is missing in the SRS, return an empty array [] for that field.
- For missingOrAmbiguousRequirements: identify gaps — missing edge cases, undefined error handling, unclear validation rules, missing role permissions, unspecified data formats.
- For inferredBusinessLogic: infer logical business rules that MUST exist for the system to work correctly even if not written explicitly in the SRS.
- Do NOT hallucinate. Only infer what is logically necessary.`

const analyzerAgent = new Agent({
  name: 'SRS Analyzer Agent',
  model: 'gpt-4o',
  instructions: ANALYZER_INSTRUCTIONS
})

export async function runAnalyzerAgent(srsText) {
  const result = await run(
    analyzerAgent,
    `Analyze this SRS document and extract all structured information:\n\n${srsText}`
  )
  return parseJsonSafe(result.finalOutput, 'object')
}
