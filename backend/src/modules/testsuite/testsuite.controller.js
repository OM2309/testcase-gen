import Project from '../project/project.model.js'
import RequirementAnalysis from '../requirement/requirement.model.js'
import TestSuite from './testsuite.model.js'
import { runAgent2 } from './testsuite.service.js'
import { callOpenAI } from '../../shared/openai.service.js'
import { aiGenerateSystemPrompt, buildAiGenerateUserPrompt } from './testsuite.aiGenerate.prompt.js'
import { ApiError } from '../../utils/apiError.js'
import { sendSuccess } from '../../utils/responseHelper.js'

export async function generateTestSuite(req, res, next) {
  const { projectId } = req.params
  const { srsDocumentId } = req.body

  try {
    const project = await Project.findById(projectId)
    if (!project) {
      throw new ApiError('Project not found', 404)
    }

    const query = { projectId }
    if (srsDocumentId) query.srsDocumentId = srsDocumentId

    const requirementAnalysis = await RequirementAnalysis.findOne(query)
    if (!requirementAnalysis || !requirementAnalysis.analyzedData) {
      throw new ApiError('Requirement analysis not completed yet. Run Agent 1 first.', 400)
    }

    try {
      const testSuiteJson = await runAgent2({
        requirementId: requirementAnalysis._id.toString(),
        requirementJson: requirementAnalysis.analyzedData
      })

      const suite = await TestSuite.findOneAndUpdate(
        { projectId, srsDocumentId: srsDocumentId || null },
        {
          srsDocumentId: srsDocumentId || null,
          suiteName: testSuiteJson.suite_name || 'Automated Test Suite',
          projectName: testSuiteJson.project_name || project.projectName,
          generatedFromRequirementId: requirementAnalysis._id,
          testCases: testSuiteJson.test_cases || []
        },
        { upsert: true, new: true }
      )

      await Project.findByIdAndUpdate(projectId, { status: 'tests_generated' })

      return sendSuccess(res, 'Test suite generated successfully.', suite, 201)
    } catch (err) {
      await Project.findByIdAndUpdate(projectId, {
        status: 'failed',
        errorMessage: `Test generation failed: ${err.message}`
      })
      throw err
    }
  } catch (err) {
    next(err)
  }
}

export async function getTestSuiteByProjectId(req, res, next) {
  const { projectId } = req.params

  try {
    const suites = await TestSuite.find({ projectId }).lean()

    return sendSuccess(res, 'Test suites fetched successfully.', suites)
  } catch (err) {
    next(err)
  }
}

export async function updateTestSuite(req, res, next) {
  const { projectId, suiteId } = req.params
  const { testCases } = req.body

  try {
    const suite = await TestSuite.findOneAndUpdate(
      { _id: suiteId, projectId },
      { testCases },
      { new: true }
    )

    if (!suite) {
      throw new ApiError('Test suite not found for this project', 404)
    }

    return sendSuccess(res, 'Test suite updated successfully.', suite)
  } catch (err) {
    next(err)
  }
}

export async function toggleTestCaseRegressive(req, res, next) {
  const { projectId, suiteId, testCaseId } = req.params

  try {
    const suite = await TestSuite.findOne({ _id: suiteId, projectId })
    if (!suite) {
      throw new ApiError('Test suite not found for this project', 404)
    }

    const testCase = suite.testCases.find(tc => tc.id === testCaseId)
    if (!testCase) {
      throw new ApiError('Test case not found in the suite', 404)
    }

    testCase.isRegressive = !testCase.isRegressive
    await suite.save()

    return sendSuccess(res, 'Test case regressive status toggled.', suite)
  } catch (err) {
    next(err)
  }
}

export async function aiGenerateTestCase(req, res, next) {
  const { projectId } = req.params
  const { requirement, module, priority } = req.body

  try {
    if (!requirement || !requirement.trim()) {
      throw new ApiError('Requirement description is required', 400)
    }

    const project = await Project.findById(projectId)
    if (!project) {
      throw new ApiError('Project not found', 404)
    }

    const userPrompt = buildAiGenerateUserPrompt({
      requirement: requirement.trim(),
      module: module || 'General',
      priority: priority || 'Medium'
    })

    const testCase = await callOpenAI({
      systemPrompt: aiGenerateSystemPrompt,
      userPrompt,
      temperature: 0.3,
      jsonMode: true
    })

    // Ensure the test case has a unique id
    if (!testCase.id || testCase.id === 'TC-<timestamp>') {
      testCase.id = `TC-${Date.now()}`
    }

    return sendSuccess(res, 'Test case generated successfully.', testCase, 201)
  } catch (err) {
    next(err)
  }
}
