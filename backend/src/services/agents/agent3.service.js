import { callOpenAI } from '../ai/openai.service.js'
import { agent3RecoverySystemPrompt, buildAgent3RecoveryPrompt } from './prompts/agent3.prompt.js'

export async function runAgent3Recovery({
  testCase,
  failedStep,
  errorMessage,
  currentUrl,
  domSnippet,
  visibleText
}) {
  const userPrompt = buildAgent3RecoveryPrompt({
    testCase,
    failedStep,
    errorMessage,
    currentUrl,
    domSnippet,
    visibleText
  })

  const result = await callOpenAI({
    systemPrompt: agent3RecoverySystemPrompt,
    userPrompt,
    temperature: 0.1
  })

  return JSON.parse(result)
}
