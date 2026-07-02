import fs from 'fs'
import mongoose from 'mongoose'
import Project from '../models/project.model.js'
import RequirementAnalysis from '../models/requirementAnalysis.model.js'
import TestSuite from '../models/testSuite.model.js'
import { parseFile } from '../services/fileParser.service.js'
import { ApiError } from '../utils/apiError.js'

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * Creates a project by uploading a file, parsing it, and saving it to MongoDB.
 */
export async function createProject(req, res, next) {
  try {
    const { projectName, projectDescription } = req.body

    if (!req.file) {
      throw new ApiError('No file uploaded. Send a PDF or DOCX file with field name "srs".', 400)
    }

    console.log(`[PROJECT CONTROLLER] Parsing uploaded file: ${req.file.path}`)
    const parsedText = await parseFile(req.file.path)

    const project = await Project.create({
      projectName: projectName || 'Untitled Project',
      projectDescription: projectDescription || '',
      documentName: req.file.originalname,
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      parsedText,
      status: 'uploaded'
    })

    return res.status(201).json({
      success: true,
      data: project
    })
  } catch (err) {
    // If upload fails, cleanup file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkErr) {
        console.warn('[PROJECT CONTROLLER] Failed to remove file after error:', unlinkErr.message)
      }
    }
    next(err)
  }
}

/**
 * Gets all projects sorted by creation date.
 */
export async function getProjects(req, res, next) {
  try {
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .lean()

    const projectsWithDetails = await Promise.all(projects.map(async (project) => {
      const suite = await TestSuite.findOne({ projectId: project._id }).select('testCases').lean()
      return {
        ...project,
        hasTestSuite: !!suite,
        testCasesCount: suite ? suite.testCases?.length || 0 : 0
      }
    }))

    return res.status(200).json({
      success: true,
      data: projectsWithDetails
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Gets project by ID, including related RequirementAnalysis and TestSuite.
 */
export async function getProjectById(req, res, next) {
  try {
    const { projectId } = req.params

    if (!isValidObjectId(projectId)) {
      throw new ApiError('Invalid project ID format.', 400)
    }

    const project = await Project.findById(projectId).lean()
    if (!project) {
      throw new ApiError('Project not found.', 404)
    }

    const [requirementAnalysis, testSuite] = await Promise.all([
      RequirementAnalysis.findOne({ projectId }).lean(),
      TestSuite.findOne({ projectId }).lean()
    ])

    return res.status(200).json({
      success: true,
      data: {
        project,
        requirementAnalysis,
        testSuite
      }
    })
  } catch (err) {
    next(err)
  }
}

/**
 * Deletes project by ID, including related files, RequirementAnalysis, and TestSuites.
 */
export async function deleteProject(req, res, next) {
  try {
    const { projectId } = req.params

    if (!isValidObjectId(projectId)) {
      throw new ApiError('Invalid project ID format.', 400)
    }

    const project = await Project.findById(projectId)
    if (!project) {
      throw new ApiError('Project not found.', 404)
    }

    if (project.filePath && fs.existsSync(project.filePath)) {
      try {
        fs.unlinkSync(project.filePath)
      } catch (err) {
        console.warn(`[PROJECT CONTROLLER] Failed to delete SRS file at ${project.filePath}:`, err.message)
      }
    }

    await Promise.all([
      Project.findByIdAndDelete(projectId),
      RequirementAnalysis.deleteMany({ projectId }),
      TestSuite.deleteMany({ projectId })
    ])

    return res.status(200).json({
      success: true,
      message: 'Project and all associated data deleted successfully.'
    })
  } catch (err) {
    next(err)
  }
}
