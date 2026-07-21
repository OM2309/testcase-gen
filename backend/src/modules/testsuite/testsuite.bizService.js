import Project from '../project/project.model.js'
import { testSuiteRepository } from './testsuite.repository.js'
import { projectRepository } from '../project/project.repository.js'
import { requirementRepository } from '../requirement/requirement.repository.js'
import { runAgent2 } from './testsuite.service.js'
import { callOpenAI } from '../../shared/openai.service.js'
import {
  aiGenerateSystemPrompt,
  buildAiGenerateUserPrompt,
} from './testsuite.aiGenerate.prompt.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'

export const aiUpdateStepsSystemPrompt = `You are an expert QA automation engineer.
You are given an existing automated test case with its steps and details.
The user wants to update the steps and metadata (like expected results or preconditions) based on their instructions and optionally a screenshot showing the page layout.

You must output a JSON object containing the updated fields:
- expected_result: string
- preconditions: array of strings
- steps: array of updated step objects. Each step object must have:
  - step_number: integer
  - action: string
  - target: string
  - value: string
  - description: string
  - expected: string

Format your output strictly as a JSON object with these keys. Do not include markdown code block formatting in your response. Return ONLY the raw JSON object.`

export class TestSuiteService {
  constructor(
    testSuiteRepo = testSuiteRepository,
    projRepo = projectRepository,
    reqRepo = requirementRepository
  ) {
    this.testSuiteRepo = testSuiteRepo
    this.projRepo = projRepo
    this.reqRepo = reqRepo
  }

  async generateTestSuite(projectId, srsDocumentId) {
    const project = await this.projRepo.findById(projectId)
    if (!project) {
      throw new NotFoundError('Project not found')
    }

    const query = { projectId }
    if (srsDocumentId) query.srsDocumentId = srsDocumentId

    const requirementAnalysis = await this.reqRepo.findOne(query)
    if (!requirementAnalysis || !requirementAnalysis.analyzedData) {
      throw new ValidationError('Requirement analysis not completed yet. Run Agent 1 first.')
    }

    try {
      const testSuiteJson = await runAgent2({
        requirementId: requirementAnalysis._id.toString(),
        requirementJson: requirementAnalysis.analyzedData,
      })

      const suite = await this.testSuiteRepo.findOneAndUpdate(
        { projectId, srsDocumentId: srsDocumentId || null },
        {
          srsDocumentId: srsDocumentId || null,
          suiteName: testSuiteJson.suite_name || 'Automated Test Suite',
          projectName: testSuiteJson.project_name || project.projectName,
          generatedFromRequirementId: requirementAnalysis._id,
          testCases: testSuiteJson.test_cases || [],
        },
        { upsert: true, new: true }
      )

      await Project.findByIdAndUpdate(projectId, { status: 'tests_generated' })
      return suite
    } catch (err) {
      await Project.findByIdAndUpdate(projectId, {
        status: 'failed',
        errorMessage: `Test generation failed: ${err.message}`,
      })
      throw err
    }
  }

  async getTestSuiteByProjectId(projectId) {
    return this.testSuiteRepo.findByProjectId(projectId)
  }

  async updateTestSuite(projectId, suiteId, testCases) {
    const suite = await this.testSuiteRepo.findOneAndUpdate(
      { _id: suiteId, projectId },
      { testCases },
      { new: true }
    )

    if (!suite) {
      throw new NotFoundError('Test suite not found for this project')
    }

    return suite
  }

  async toggleTestCaseRegressive(projectId, suiteId, testCaseId) {
    const suite = await this.testSuiteRepo.findOne({ _id: suiteId, projectId })
    if (!suite) {
      throw new NotFoundError('Test suite not found for this project')
    }

    const testCase = suite.testCases.find((tc) => tc.id === testCaseId)
    if (!testCase) {
      throw new NotFoundError('Test case not found in the suite')
    }

    testCase.isRegressive = !testCase.isRegressive
    await this.testSuiteRepo.save(suite)
    return suite
  }

  async aiGenerateTestCase(projectId, { requirement, module, priority }) {
    const project = await this.projRepo.findById(projectId)
    if (!project) {
      throw new NotFoundError('Project not found')
    }

    const userPrompt = buildAiGenerateUserPrompt({
      requirement: requirement.trim(),
      module: module || 'General',
      priority: priority || 'Medium',
    })

    const testCase = await callOpenAI({
      systemPrompt: aiGenerateSystemPrompt,
      userPrompt,
      temperature: 0.3,
      jsonMode: true,
    })

    if (!testCase.id || testCase.id === 'TC-<timestamp>') {
      testCase.id = `TC-${Date.now()}`
    }

    return testCase
  }

  async aiUpdateTestCaseSteps(projectId, { testCase, instructions, screenshot }) {
    const userPrompt = `Existing Test Case:
Title: ${testCase.title}
Expected Result: ${testCase.expected_result || ''}
Preconditions: ${JSON.stringify(testCase.preconditions || [])}
Current Steps:
${JSON.stringify(testCase.steps || [], null, 2)}

User Instructions: ${instructions.trim()}
${screenshot ? 'Please examine the attached screenshot of the UI state to align selectors and steps.' : ''}

Update the test case steps and expected outcome to match the user's instructions and visual layout.`

    return callOpenAI({
      systemPrompt: aiUpdateStepsSystemPrompt,
      userPrompt,
      temperature: 0.3,
      jsonMode: true,
      image: screenshot || null,
    })
  }
}

export const testSuiteService = new TestSuiteService()
