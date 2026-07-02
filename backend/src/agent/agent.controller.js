import Project from '../project/project.model.js'
import TestSuite from '../execution/testSuite.model.js'
import { runAgent1 } from './services/agent1.service.js'
import { runAgent2 } from './services/agent2.service.js'
import { sendSuccess, sendError } from '../utils/responseHelper.js'

export async function analyzePRD(req, res) {
  const { documentId, text } = req.body

  if (!documentId) {
    return sendError(res, 'documentId is required', 400)
  }

  try {
    const project = await Project.findById(documentId)
    if (!project) {
      return sendError(res, 'Project document not found', 404)
    }

    const srsText = text || project.parsedText
    if (!srsText) {
      return sendError(res, 'No text content available for analysis', 400)
    }

    await Project.findByIdAndUpdate(documentId, { status: 'analyzing' })

    console.log(`[Agent 1] Analyzing document ${documentId}...`)
    const requirements = await runAgent1({
      documentName: project.originalFileName,
      documentText: srsText
    })

    const updatedProject = await Project.findByIdAndUpdate(documentId, {
      status: 'completed',
      projectName: requirements.project_name || project.projectName,
      projectDescription: requirements.summary || project.projectDescription,
      documentName: requirements.document_name || project.documentName,
      totalModules: requirements.modules?.length || 0,
      analyzedData: requirements
    }, { returnDocument: 'after' })

    return sendSuccess(res, {
      requirementId: updatedProject._id,
      requirements: updatedProject.analyzedData
    })

  } catch (err) {
    console.error('[Agent 1] Analysis failed:', err.message)
    if (documentId) {
      await Project.findByIdAndUpdate(documentId, {
        status: 'failed',
        errorMessage: err.message
      })
    }
    return sendError(res, `Requirement analysis failed: ${err.message}`)
  }
}

export async function generateTestCases(req, res) {
  const { requirementId, requirements } = req.body

  if (!requirementId) {
    return sendError(res, 'requirementId is required', 400)
  }

  try {
    const project = await Project.findById(requirementId)
    if (!project) {
      return sendError(res, 'Project document not found', 404)
    }

    const reqData = requirements || project.analyzedData
    if (!reqData) {
      return sendError(res, 'No requirement data available for test generation', 400)
    }

    console.log(`[Agent 2] Generating test cases for requirement ${requirementId}...`)
    const testCasesOutput = await runAgent2({
      requirementId,
      requirementJson: reqData
    })

    const testSuite = await TestSuite.create({
      projectId: requirementId,
      suiteName: testCasesOutput.suite_name || 'Automated Test Suite',
      projectName: testCasesOutput.project_name || project.projectName,
      testCases: testCasesOutput.test_cases || []
    })

    return sendSuccess(res, {
      testSuiteId: testSuite._id,
      testCases: testSuite.testCases
    }, 201)

  } catch (err) {
    console.error('[Agent 2] Test case generation failed:', err.message)
    return sendError(res, `Test case generation failed: ${err.message}`)
  }
}
