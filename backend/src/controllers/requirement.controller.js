import Project from '../models/project.model.js'
import RequirementAnalysis from '../models/requirementAnalysis.model.js'
import { runAgent1 } from '../services/agent1.service.js'
import { ApiError } from '../utils/apiError.js'

/**
 * Runs Agent 1 on the project's parsed SRS text and saves the requirement analysis.
 */
export async function generateRequirements(req, res, next) {
  const { projectId } = req.params

  try {
    const project = await Project.findById(projectId)
    if (!project) {
      throw new ApiError('Project not found', 404)
    }

    if (!project.parsedText) {
      throw new ApiError('No parsed text available in the project to analyze', 400)
    }

    // Set project status to analyzing
    await Project.findByIdAndUpdate(projectId, { status: 'analyzing', processingStartedAt: new Date() })

    console.log(`[REQUIREMENT CONTROLLER] Generating requirements for project ${projectId}...`)

    try {
      const requirementsJson = await runAgent1({
        documentName: project.documentName || project.originalFileName,
        documentText: project.parsedText
      })

      // Upsert the requirement analysis
      const analysis = await RequirementAnalysis.findOneAndUpdate(
        { projectId },
        {
          analyzedData: requirementsJson,
          status: 'completed',
          errorMessage: null
        },
        { upsert: true, new: true }
      )

      // Update project metadata from the analysis if available
      const projectName = requirementsJson.project_name || project.projectName
      const totalModules = requirementsJson.modules?.length || 0

      await Project.findByIdAndUpdate(projectId, {
        status: 'analyzed',
        projectName,
        totalModules,
        processingCompletedAt: new Date()
      })

      return res.status(200).json({
        success: true,
        data: analysis
      })
    } catch (err) {
      // Mark project as failed
      await Project.findByIdAndUpdate(projectId, {
        status: 'failed',
        errorMessage: err.message,
        processingCompletedAt: new Date()
      })

      await RequirementAnalysis.findOneAndUpdate(
        { projectId },
        { status: 'failed', errorMessage: err.message },
        { upsert: true }
      )

      throw err
    }
  } catch (err) {
    next(err)
  }
}

/**
 * Retrieves the requirement analysis for a given project.
 */
export async function getRequirementsByProjectId(req, res, next) {
  const { projectId } = req.params

  try {
    const analysis = await RequirementAnalysis.findOne({ projectId })
    if (!analysis) {
      throw new ApiError('Requirement analysis not found for this project', 404)
    }

    return res.status(200).json({
      success: true,
      data: analysis
    })
  } catch (err) {
    next(err)
  }
}
