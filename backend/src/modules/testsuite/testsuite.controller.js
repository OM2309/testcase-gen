import { testSuiteService } from '../../services/testsuite.service.js'
import { sendSuccess } from '../../utils/responseHelper.js'

export async function generateTestSuite(req, res, next) {
  try {
    const { projectId } = req.params
    const { srsDocumentId } = req.body
    const suite = await testSuiteService.generateTestSuite(projectId, srsDocumentId)
    return sendSuccess(res, 'Test suite generated successfully.', suite, 201)
  } catch (err) {
    next(err)
  }
}

export async function getTestSuiteByProjectId(req, res, next) {
  try {
    const { projectId } = req.params
    const suites = await testSuiteService.getTestSuiteByProjectId(projectId)
    return sendSuccess(res, 'Test suites fetched successfully.', suites)
  } catch (err) {
    next(err)
  }
}

export async function updateTestSuite(req, res, next) {
  try {
    const { projectId, suiteId } = req.params
    const { testCases } = req.body
    const suite = await testSuiteService.updateTestSuite(projectId, suiteId, testCases)
    return sendSuccess(res, 'Test suite updated successfully.', suite)
  } catch (err) {
    next(err)
  }
}

export async function toggleTestCaseRegressive(req, res, next) {
  try {
    const { projectId, suiteId, testCaseId } = req.params
    const suite = await testSuiteService.toggleTestCaseRegressive(projectId, suiteId, testCaseId)
    return sendSuccess(res, 'Test case regressive status toggled.', suite)
  } catch (err) {
    next(err)
  }
}

export async function aiGenerateTestCase(req, res, next) {
  try {
    const { projectId } = req.params
    const testCase = await testSuiteService.aiGenerateTestCase(projectId, req.body)
    return sendSuccess(res, 'Test case generated successfully.', testCase, 201)
  } catch (err) {
    next(err)
  }
}

export async function aiUpdateTestCaseSteps(req, res, next) {
  try {
    const { projectId } = req.params
    const updatedData = await testSuiteService.aiUpdateTestCaseSteps(projectId, req.body)
    return sendSuccess(res, 'Test case steps updated successfully.', updatedData)
  } catch (err) {
    next(err)
  }
}
