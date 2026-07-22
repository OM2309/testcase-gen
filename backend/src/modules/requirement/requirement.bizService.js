import Project from '../project/project.model.js'
import { requirementRepository } from './requirement.repository.js'
import { projectRepository } from '../project/project.repository.js'
import {
  runAgent1,
  runAgent0,
  runAgent3GapFill,
} from './requirement.service.js'
import { ApiError } from '../../utils/apiError.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'

export class RequirementService {
  constructor(reqRepo = requirementRepository, projRepo = projectRepository) {
    this.reqRepo = reqRepo
    this.projRepo = projRepo
  }

  async analyzeScore(projectId, srsDocumentId) {
    const project = await this.projRepo.findById(projectId)
    if (!project) {
      throw new NotFoundError('Project not found')
    }

    let documentText = null
    let documentName = null

    if (srsDocumentId) {
      const srsDoc = project.srsDocuments.find((d) => d._id.toString() === srsDocumentId)
      if (!srsDoc) {
        throw new NotFoundError('SRS document not found in project')
      }
      documentText = srsDoc.parsedText
      documentName = srsDoc.originalFileName
    } else {
      if (!project.parsedText) {
        throw new ValidationError('No parsed text available in the project to analyze')
      }
      documentText = project.parsedText
      documentName = project.documentName || project.originalFileName
    }

    const targetSrsDocumentId = srsDocumentId || null

    await Project.findByIdAndUpdate(projectId, {
      status: 'scoring',
      processingStartedAt: new Date(),
    })

    try {
      const agent0Data = await runAgent0({ documentName, documentText })
      const agent0Score = typeof agent0Data?.score === 'number' ? agent0Data.score : 0

      const analysis = await this.reqRepo.findOneAndUpdate(
        { projectId, srsDocumentId: targetSrsDocumentId },
        {
          agent0Score,
          agent0Feedback: agent0Data || null,
          agent0Status: 'completed',
          errorMessage: null,
        },
        { upsert: true, new: true }
      )

      await Project.findByIdAndUpdate(projectId, {
        status: 'scored',
        processingCompletedAt: new Date(),
      })

      return analysis
    } catch (err) {
      await Project.findByIdAndUpdate(projectId, {
        status: 'failed',
        errorMessage: err.message,
        processingCompletedAt: new Date(),
      })

      await this.reqRepo.findOneAndUpdate(
        { projectId, srsDocumentId: targetSrsDocumentId },
        { agent0Status: 'failed', errorMessage: err.message },
        { upsert: true }
      )

      throw err
    }
  }

  async generateRequirements(projectId, srsDocumentId) {
    const project = await this.projRepo.findById(projectId)
    if (!project) {
      throw new NotFoundError('Project not found')
    }

    let documentText = null
    let documentName = null

    if (srsDocumentId) {
      const srsDoc = project.srsDocuments.find((d) => d._id.toString() === srsDocumentId)
      if (!srsDoc) {
        throw new NotFoundError('SRS document not found in project')
      }
      documentText = srsDoc.parsedText
      documentName = srsDoc.originalFileName
    } else {
      if (!project.parsedText) {
        throw new ValidationError('No parsed text available in the project to analyze')
      }
      documentText = project.parsedText
      documentName = project.documentName || project.originalFileName
    }

    const targetSrsDocumentId = srsDocumentId || null

    await Project.findByIdAndUpdate(projectId, {
      status: 'analyzing',
      processingStartedAt: new Date(),
    })

    try {
      const requirementsJson = await runAgent1({ documentName, documentText })

      const analysis = await this.reqRepo.findOneAndUpdate(
        { projectId, srsDocumentId: targetSrsDocumentId },
        {
          analyzedData: requirementsJson,
          status: 'completed',
          errorMessage: null,
        },
        { upsert: true, new: true }
      )

      const projectName = requirementsJson.project_name || project.projectName
      const totalModules = requirementsJson.modules?.length || 0

      await Project.findByIdAndUpdate(projectId, {
        status: 'analyzed',
        projectName,
        totalModules,
        processingCompletedAt: new Date(),
      })

      return analysis
    } catch (err) {
      await Project.findByIdAndUpdate(projectId, {
        status: 'failed',
        errorMessage: err.message,
        processingCompletedAt: new Date(),
      })

      await this.reqRepo.findOneAndUpdate(
        { projectId, srsDocumentId: targetSrsDocumentId },
        { status: 'failed', errorMessage: err.message },
        { upsert: true }
      )

      throw err
    }
  }

  async getRequirementsByProjectId(projectId) {
    return this.reqRepo.findByProjectId(projectId)
  }

  async generateGapFill(projectId, srsDocumentId) {
    const project = await this.projRepo.findById(projectId)
    if (!project) {
      throw new NotFoundError('Project not found')
    }

    const targetSrsDocumentId = srsDocumentId || null
    const analysis = await this.reqRepo.findOne({ projectId, srsDocumentId: targetSrsDocumentId })

    if (!analysis || analysis.status !== 'completed') {
      throw new ValidationError('Requirement analysis not completed yet. Run analysis first.')
    }

    if (!analysis.agent0Feedback || analysis.agent0Status !== 'completed') {
      throw new ValidationError('Agent 0 accuracy rating not available. Run analysis first.')
    }

    const feedback = analysis.agent0Feedback
    const missingDetails = Array.isArray(feedback.missing_details) ? feedback.missing_details : []
    const ambiguities = Array.isArray(feedback.ambiguities) ? feedback.ambiguities : []

    if (missingDetails.length === 0 && ambiguities.length === 0) {
      throw new ValidationError('No gaps found in the document. The SRS appears complete.')
    }

    let documentText = null
    let documentName = null

    if (srsDocumentId) {
      const srsDoc = project.srsDocuments.find((d) => d._id.toString() === srsDocumentId)
      if (!srsDoc) {
        throw new NotFoundError('SRS document not found in project')
      }
      documentText = srsDoc.parsedText
      documentName = srsDoc.originalFileName
    } else {
      documentText = project.parsedText
      documentName = project.documentName || project.originalFileName
    }

    await this.reqRepo.findByIdAndUpdate(analysis._id, { gapFillStatus: 'pending' })

    try {
      const gapFillResult = await runAgent3GapFill({
        documentName,
        documentText,
        missingDetails,
        ambiguities,
      })

      return await this.reqRepo.findByIdAndUpdate(
        analysis._id,
        {
          gapFillData: gapFillResult,
          gapFillStatus: 'completed',
        },
        { new: true }
      )
    } catch (err) {
      await this.reqRepo.findByIdAndUpdate(analysis._id, {
        gapFillStatus: 'failed',
        gapFillData: { error: err.message },
      })
      throw err
    }
  }
}

export const requirementService = new RequirementService()
