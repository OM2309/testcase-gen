import { Agent, run } from '@openai/agents'
import { sanitizeCodeResponse } from '../utils/sanitizer.js'

const TESTCODE_INSTRUCTIONS = `You are an expert Test Automation Engineer specializing in writing production-ready Jest test files.

You will receive:
1. A module object containing moduleId, moduleName, and description
2. An array of test cases for that module

Your job is to generate a complete, executable Jest test file for all the provided test cases.

RULES FOR CODE GENERATION:
- Use Jest as the testing framework (describe, it, expect blocks)
- Use jest.fn() for mocking service/API calls
- Each test case must be inside its own it() or test() block
- Group tests by type using nested describe() blocks: describe('Positive Tests'), describe('Negative Tests'), describe('Edge Cases'), describe('Business Logic'), describe('Role Based'), describe('Missing Requirements')
- Add beforeEach() to reset mocks before each test
- Write realistic mock data matching the inputData from each test case
- Each test must have a comment above it showing the testCaseId and requirementId
- Handle async operations with async/await
- For negative tests, use expect().rejects or expect().toThrow() or check error response status codes
- For API endpoint tests, mock the request/response objects properly
- Import structure at top: import the module/service being tested as a mock
- File must be fully self-contained and runnable with: npx jest <filename>
- DO NOT use any external libraries other than Jest built-ins
- Add a comment block at the very top of the file with: Module Name, Total Test Cases, Generated Date, Coverage Summary

OUTPUT FORMAT:
Return ONLY the raw JavaScript code. No markdown. No code blocks. No explanation. Just the .js file content starting with the comment block.`

const testCodeAgent = new Agent({
  name: 'Test Code Generator Agent',
  model: 'gpt-4o',
  instructions: TESTCODE_INSTRUCTIONS
})

export async function runTestCodeAgent(moduleInfo, testCases) {
  const prompt = `Generate a complete Jest test file for the following module and test cases.

MODULE INFO:
${JSON.stringify(moduleInfo, null, 2)}

TEST CASES:
${JSON.stringify(testCases, null, 2)}`

  const result = await run(testCodeAgent, prompt)
  return sanitizeCodeResponse(result.finalOutput)
}
