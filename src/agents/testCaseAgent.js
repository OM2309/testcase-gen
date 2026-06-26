import { Agent, run } from '@openai/agents'
import { z } from 'zod'

const TESTCASE_INSTRUCTIONS = `You are a Senior QA Engineer and Test Architect with 10+ years of experience writing comprehensive test cases.

You will receive a structured JSON object from an SRS Analyzer. It contains functional requirements, non-functional requirements, business rules, missing requirements, inferred logic, modules, actors, and constraints.

Generate EXHAUSTIVE test cases covering ALL of the following types for EVERY functional requirement:
1. Positive — valid inputs, expected happy path behavior
2. Negative — invalid inputs, unauthorized access, error handling
3. Edge Case — boundary values, empty strings, null values, max/min limits, special characters
4. Business Logic — derived from businessRules and inferredBusinessLogic fields
5. Role Based — different behavior expected per user role (Admin vs User vs Guest etc.)
6. Missing Requirement — test cases for gaps identified in missingOrAmbiguousRequirements

RULES:
- Generate MINIMUM 5 test cases per functional requirement (at least 2 positive, 2 negative, 1 edge case).
- For every item in missingOrAmbiguousRequirements, generate at least 2 test cases with requirementId = MISSING.
- For every item in inferredBusinessLogic, generate at least 1 test case with requirementId = INFERRED.
- Use realistic, domain-specific input data — not placeholder values like "test123".
- Steps must be clear, numbered, and actionable — written as if a human tester is executing them manually.`

const TestCaseSchema = z.object({
  testCaseId: z.string().describe("e.g. TC-001"),
  moduleId: z.string().describe("e.g. MOD-001"),
  requirementId: z.string().describe("FR-001 or NFR-001 or INFERRED or MISSING"),
  title: z.string().describe("short descriptive title"),
  type: z.enum(['Positive', 'Negative', 'Edge Case', 'Business Logic', 'Role Based', 'Missing Requirement']),
  priority: z.enum(['High', 'Medium', 'Low']),
  userRole: z.string().describe("which role performs this test, e.g. Admin, User, Guest"),
  preconditions: z.array(z.string()).describe("conditions that must be true before test runs"),
  steps: z.array(z.string()).describe("Step-by-step description"),
  inputData: z.string().describe("realistic test data dictionary serialized as a JSON string. E.g., '{\"email\":\"admin@example.com\",\"password\":\"SecurePass123!\"}'"),
  expectedResult: z.string().describe("exact expected outcome"),
  edgeCaseNote: z.string().nullable().optional().describe("only fill if type is Edge Case, explain the boundary being tested")
})

const TestCaseResponseSchema = z.object({
  testCases: z.array(TestCaseSchema)
})

const testCaseAgent = new Agent({
  name: 'Test Case Generator Agent',
  model: 'gpt-4o',
  instructions: TESTCASE_INSTRUCTIONS,
  outputType: TestCaseResponseSchema
})

async function generateForChunk(chunkData, chunkLabel, retryCount = 2) {
  let attempt = 0
  while (attempt <= retryCount) {
    try {
      console.log(`[testCaseAgent] [${chunkLabel}] Generating test cases (Attempt ${attempt + 1}/${retryCount + 1})...`)
      const result = await run(
        testCaseAgent,
        `Generate comprehensive test cases for this analyzed SRS data subset:\n\n${JSON.stringify(chunkData, null, 2)}`
      )

      const testCases = result.finalOutput?.testCases
      if (!Array.isArray(testCases)) {
        throw new Error("Invalid output format: expected an array of test cases inside 'testCases' property.")
      }

      console.log(`[testCaseAgent] [${chunkLabel}] Successfully generated ${testCases.length} test cases.`)
      return testCases
    } catch (err) {
      attempt++
      console.warn(`[testCaseAgent] [${chunkLabel}] Attempt ${attempt} failed: ${err.message}`)
      if (attempt > retryCount) {
        throw new Error(`Failed to generate test cases for ${chunkLabel} after ${retryCount + 1} attempts. Original error: ${err.message}`)
      }
    }
  }
}

export async function runTestCaseAgent(analyzedData) {
  const frs = analyzedData.functionalRequirements || []
  const missingReqs = analyzedData.missingOrAmbiguousRequirements || []
  const inferredRules = analyzedData.inferredBusinessLogic || []

  const chunks = []

  // 1. Group functional requirements into chunks of 3
  const frChunkSize = 3
  for (let i = 0; i < frs.length; i += frChunkSize) {
    const chunk = frs.slice(i, i + frChunkSize)
    chunks.push({
      label: `FR Chunk ${Math.floor(i / frChunkSize) + 1}`,
      data: {
        projectName: analyzedData.projectName || 'Untitled Project',
        projectDescription: analyzedData.projectDescription || '',
        modules: analyzedData.modules || [],
        functionalRequirements: chunk,
        nonFunctionalRequirements: analyzedData.nonFunctionalRequirements || [],
        userRoles: analyzedData.userRoles || [],
        assumptions: analyzedData.assumptions || [],
        constraints: analyzedData.constraints || [],
        missingOrAmbiguousRequirements: [],
        inferredBusinessLogic: []
      }
    })
  }

  // 2. Group missing requirements into chunks of 5
  const missingChunkSize = 5
  for (let i = 0; i < missingReqs.length; i += missingChunkSize) {
    const chunk = missingReqs.slice(i, i + missingChunkSize)
    chunks.push({
      label: `Missing Req Chunk ${Math.floor(i / missingChunkSize) + 1}`,
      data: {
        projectName: analyzedData.projectName || 'Untitled Project',
        projectDescription: analyzedData.projectDescription || '',
        modules: analyzedData.modules || [],
        functionalRequirements: [],
        nonFunctionalRequirements: analyzedData.nonFunctionalRequirements || [],
        userRoles: analyzedData.userRoles || [],
        assumptions: analyzedData.assumptions || [],
        constraints: analyzedData.constraints || [],
        missingOrAmbiguousRequirements: chunk,
        inferredBusinessLogic: []
      }
    })
  }

  // 3. Group inferred business logic into chunks of 5
  const inferredChunkSize = 5
  for (let i = 0; i < inferredRules.length; i += inferredChunkSize) {
    const chunk = inferredRules.slice(i, i + inferredChunkSize)
    chunks.push({
      label: `Inferred Logic Chunk ${Math.floor(i / inferredChunkSize) + 1}`,
      data: {
        projectName: analyzedData.projectName || 'Untitled Project',
        projectDescription: analyzedData.projectDescription || '',
        modules: analyzedData.modules || [],
        functionalRequirements: [],
        nonFunctionalRequirements: analyzedData.nonFunctionalRequirements || [],
        userRoles: analyzedData.userRoles || [],
        assumptions: analyzedData.assumptions || [],
        constraints: analyzedData.constraints || [],
        missingOrAmbiguousRequirements: [],
        inferredBusinessLogic: chunk
      }
    })
  }

  if (chunks.length === 0) {
    return []
  }

  console.log(`[testCaseAgent] Total chunks to process: ${chunks.length}`)

  // Run chunks in parallel with a retry mechanism
  const results = await Promise.all(
    chunks.map(chunk => generateForChunk(chunk.data, chunk.label))
  )

  let allTestCases = results.flat()

  // Re-sequence testCaseId starting from TC-001 sequentially to avoid overlap, and parse inputData back into objects
  allTestCases = allTestCases.map((tc, index) => {
    let parsedInput = {}
    if (tc.inputData) {
      try {
        parsedInput = typeof tc.inputData === 'string' ? JSON.parse(tc.inputData) : tc.inputData
      } catch (err) {
        parsedInput = { raw: tc.inputData }
      }
    }

    const sequenceNum = String(index + 1).padStart(3, '0')
    return {
      ...tc,
      testCaseId: `TC-${sequenceNum}`,
      inputData: parsedInput
    }
  })

  return allTestCases
}
