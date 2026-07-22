import { requirementService } from './requirement.bizService.js'
import { sendSuccess } from '../../utils/responseHelper.js'

export async function analyzeScore(req, res, next) {
  try {
    const { projectId, srsDocumentId } = req.params
    const analysis = await requirementService.analyzeScore(projectId, srsDocumentId)
    return sendSuccess(res, 'Document accuracy score generated successfully.', analysis)
  } catch (err) {
    next(err)
  }
}

export async function generateRequirements(req, res, next) {
  try {
    const { projectId, srsDocumentId } = req.params
    const analysis = await requirementService.generateRequirements(projectId, srsDocumentId)
    return sendSuccess(res, 'Requirements generated successfully.', analysis)
  } catch (err) {
    next(err)
  }
}

export async function getRequirementsByProjectId(req, res, next) {
  try {
    const { projectId } = req.params
    const analyses = await requirementService.getRequirementsByProjectId(projectId)
    return sendSuccess(res, 'Requirements fetched successfully.', analyses)
  } catch (err) {
    next(err)
  }
}

export async function generateGapFill(req, res, next) {
  try {
    const { projectId, srsDocumentId } = req.params
    const updatedAnalysis = await requirementService.generateGapFill(projectId, srsDocumentId)
    return sendSuccess(res, 'Gap analysis completed successfully.', updatedAnalysis)
  } catch (err) {
    next(err)
  }
}
