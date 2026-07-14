import Project from '../project/project.model.js'
import RequirementAnalysis from './requirement.model.js'
import { runAgent1, runAgent0, runAgent3GapFill } from './requirement.service.js'
import { ApiError } from '../../utils/apiError.js'
import { sendSuccess } from '../../utils/responseHelper.js'

export async function generateRequirements(req, res, next) {
  const { projectId, srsDocumentId } = req.params

  try {
    const project = await Project.findById(projectId)
    if (!project) {
      throw new ApiError('Project not found', 404)
    }

    let documentText = null
    let documentName = null

    if (srsDocumentId) {
      const srsDoc = project.srsDocuments.find(d => d._id.toString() === srsDocumentId)
      if (!srsDoc) {
        throw new ApiError('SRS document not found in project', 404)
      }
      documentText = srsDoc.parsedText
      documentName = srsDoc.originalFileName
    } else {
      if (!project.parsedText) {
        throw new ApiError('No parsed text available in the project to analyze', 400)
      }
      documentText = project.parsedText
      documentName = project.documentName || project.originalFileName
    }

    const targetSrsDocumentId = srsDocumentId || null

    await Project.findByIdAndUpdate(projectId, { status: 'analyzing', processingStartedAt: new Date() })

    try {
      // Run Agent 1 and Agent 0 in parallel using Promise.allSettled
      const [agent1Result, agent0Result] = await Promise.allSettled([
        runAgent1({ documentName, documentText }),
        runAgent0({ documentName, documentText })
      ])

      if (agent1Result.status === 'rejected') {
        throw agent1Result.reason
      }

      const requirementsJson = agent1Result.value

      let agent0Score = null
      let agent0Feedback = null
      let agent0Status = 'failed'

      if (agent0Result.status === 'fulfilled') {
        const agent0Data = agent0Result.value
        agent0Score = typeof agent0Data?.score === 'number' ? agent0Data.score : 0
        // Store the full structured object (summary, strengths, missing_details, ambiguities, recommendations)
        agent0Feedback = agent0Data || null
        agent0Status = 'completed'
      } else {
        console.error('Agent 0 failed:', agent0Result.reason)
        agent0Feedback = { summary: `Failed to score the SRS document: ${agent0Result.reason?.message || agent0Result.reason}`, strengths: [], missing_details: [], ambiguities: [], recommendations: [] }
      }

      const analysis = await RequirementAnalysis.findOneAndUpdate(
        { projectId, srsDocumentId: targetSrsDocumentId },
        {
          analyzedData: requirementsJson,
          status: 'completed',
          errorMessage: null,
          agent0Score,
          agent0Feedback,
          agent0Status
        },
        { upsert: true, new: true }
      )

      const projectName = requirementsJson.project_name || project.projectName
      const totalModules = requirementsJson.modules?.length || 0

      await Project.findByIdAndUpdate(projectId, {
        status: 'analyzed',
        projectName,
        totalModules,
        processingCompletedAt: new Date()
      })

      return sendSuccess(res, 'Requirements generated successfully.', analysis)
    } catch (err) {
      await Project.findByIdAndUpdate(projectId, {
        status: 'failed',
        errorMessage: err.message,
        processingCompletedAt: new Date()
      })

      await RequirementAnalysis.findOneAndUpdate(
        { projectId, srsDocumentId: targetSrsDocumentId },
        { status: 'failed', errorMessage: err.message },
        { upsert: true }
      )

      throw err
    }
  } catch (err) {
    next(err)
  }
}

export async function getRequirementsByProjectId(req, res, next) {
  const { projectId } = req.params

  try {
    const analyses = await RequirementAnalysis.find({ projectId }).lean()

    return sendSuccess(res, 'Requirements fetched successfully.', analyses)
  } catch (err) {
    next(err)
  }
}

export async function generateGapFill(req, res, next) {
  const { projectId, srsDocumentId } = req.params

  try {
    const project = await Project.findById(projectId)
    if (!project) {
      throw new ApiError('Project not found', 404)
    }

    // Find the requirement analysis for this SRS document
    const targetSrsDocumentId = srsDocumentId || null
    const analysis = await RequirementAnalysis.findOne({ projectId, srsDocumentId: targetSrsDocumentId })

    if (!analysis || analysis.status !== 'completed') {
      throw new ApiError('Requirement analysis not completed yet. Run analysis first.', 400)
    }

    if (!analysis.agent0Feedback || analysis.agent0Status !== 'completed') {
      throw new ApiError('Agent 0 accuracy rating not available. Run analysis first.', 400)
    }

    // Extract missing details and ambiguities from Agent 0 feedback
    const feedback = analysis.agent0Feedback
    const missingDetails = Array.isArray(feedback.missing_details) ? feedback.missing_details : []
    const ambiguities = Array.isArray(feedback.ambiguities) ? feedback.ambiguities : []

    if (missingDetails.length === 0 && ambiguities.length === 0) {
      throw new ApiError('No gaps found in the document. The SRS appears complete.', 400)
    }

    // Get the original document text
    let documentText = null
    let documentName = null

    if (srsDocumentId) {
      const srsDoc = project.srsDocuments.find(d => d._id.toString() === srsDocumentId)
      if (!srsDoc) {
        throw new ApiError('SRS document not found in project', 404)
      }
      documentText = srsDoc.parsedText
      documentName = srsDoc.originalFileName
    } else {
      documentText = project.parsedText
      documentName = project.documentName || project.originalFileName
    }

    // Update status to indicate gap-fill is in progress
    await RequirementAnalysis.findByIdAndUpdate(analysis._id, { gapFillStatus: 'pending' })

    try {
      const gapFillResult = await runAgent3GapFill({
        documentName,
        documentText,
        missingDetails,
        ambiguities
      })

      const updatedAnalysis = await RequirementAnalysis.findByIdAndUpdate(
        analysis._id,
        {
          gapFillData: gapFillResult,
          gapFillStatus: 'completed'
        },
        { new: true }
      )

      return sendSuccess(res, 'Gap analysis completed successfully.', updatedAnalysis)
    } catch (err) {
      await RequirementAnalysis.findByIdAndUpdate(analysis._id, {
        gapFillStatus: 'failed',
        gapFillData: { error: err.message }
      })
      throw err
    }
  } catch (err) {
    next(err)
  }
}

