import Project from '../project/project.model.js'
import RequirementAnalysis from './requirement.model.js'
import { runAgent1 } from './requirement.service.js'
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
      const requirementsJson = await runAgent1({ documentName, documentText })

      const analysis = await RequirementAnalysis.findOneAndUpdate(
        { projectId, srsDocumentId: targetSrsDocumentId },
        {
          analyzedData: requirementsJson,
          status: 'completed',
          errorMessage: null
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
