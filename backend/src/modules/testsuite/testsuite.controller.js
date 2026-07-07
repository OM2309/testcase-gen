import Project from '../project/project.model.js'
import RequirementAnalysis from '../requirement/requirement.model.js'
import TestSuite from './testsuite.model.js'
import { runAgent2 } from './testsuite.service.js'
import { ApiError } from '../../utils/apiError.js'

/**
 * Runs Agent 2 on the requirement analysis JSON to generate an automation-ready test suite.
 */
export async function generateTestSuite(req, res, next) {
  const { projectId } = req.params

  try {
    const project = await Project.findById(projectId)
    if (!project) {
      throw new ApiError('Project not found', 404)
    }

    const requirementAnalysis = await RequirementAnalysis.findOne({ projectId })
    if (!requirementAnalysis || !requirementAnalysis.analyzedData) {
      throw new ApiError('Requirement analysis not completed yet. Run Agent 1 first.', 400)
    }

    console.log(`[TESTSUITE CONTROLLER] Generating test cases for project ${projectId}...`)

    try {
      console.log("Hello");
      const testSuiteJson = await runAgent2({
        requirementId: requirementAnalysis._id.toString(),
        requirementJson: requirementAnalysis.analyzedData
      })
      console.log("Hello1");

      // Upsert the test suite
      const suite = await TestSuite.findOneAndUpdate(
        { projectId },
        {
          suiteName: testSuiteJson.suite_name || 'Automated Test Suite',
          projectName: testSuiteJson.project_name || project.projectName,
          generatedFromRequirementId: requirementAnalysis._id,
          testCases: testSuiteJson.test_cases || []
        },
        { upsert: true, new: true }
      )
      console.log("Hello2");

      // Update project status
      await Project.findByIdAndUpdate(projectId, { status: 'tests_generated' })
      console.log("Hello3");

      return res.status(201).json({
        success: true,
        data: suite
      })
    } catch (err) {
      console.log("err1", err);
      await Project.findByIdAndUpdate(projectId, {
        status: 'failed',
        errorMessage: `Test generation failed: ${err.message}`
      })
      throw err
    }
  } catch (err) {
    console.log("error", err);
    next(err)
  }
}

/**
 * Retrieves the test suite for a given project.
 */
export async function getTestSuiteByProjectId(req, res, next) {
  const { projectId } = req.params

  try {
    const suite = await TestSuite.findOne({ projectId })
    if (!suite) {
      throw new ApiError('Test suite not found for this project', 404)
    }

    return res.status(200).json({
      success: true,
      data: suite
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Updates the test suite (test cases, steps, etc.) for a given project.
 */
export async function updateTestSuite(req, res, next) {
  const { projectId } = req.params
  const { testCases } = req.body

  try {
    const suite = await TestSuite.findOneAndUpdate(
      { projectId },
      { testCases },
      { new: true }
    )

    if (!suite) {
      throw new ApiError('Test suite not found for this project', 404)
    }

    return res.status(200).json({
      success: true,
      data: suite
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Toggles the isRegressive status of a test case.
 */
export async function toggleTestCaseRegressive(req, res, next) {
  const { projectId, testCaseId } = req.params

  try {
    const suite = await TestSuite.findOne({ projectId })
    if (!suite) {
      throw new ApiError('Test suite not found for this project', 404)
    }

    const testCase = suite.testCases.find(tc => tc.id === testCaseId)
    if (!testCase) {
      throw new ApiError('Test case not found in the suite', 404)
    }

    // Toggle the value of isRegressive
    testCase.isRegressive = !testCase.isRegressive

    await suite.save()

    return res.status(200).json({
      success: true,
      data: suite
    })
  } catch (err) {
    next(err)
  }
}


