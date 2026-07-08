import fs from 'fs'
import mongoose from 'mongoose'
import Project from './project.model.js'
import RequirementAnalysis from '../requirement/requirement.model.js'
import TestSuite from '../testsuite/testsuite.model.js'
import { parseFile } from '../../shared/fileParser.service.js'
import { ApiError } from '../../utils/apiError.js'
import { sendSuccess } from '../../utils/responseHelper.js'

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

export async function createProjectOnly(req, res, next) {
  try {
    const { projectName, projectDescription } = req.body

    if (!projectName || !projectName.trim()) {
      throw new ApiError('Project name is required.', 400)
    }

    if (!projectDescription || !projectDescription.trim()) {
      throw new ApiError('Project description is required.', 400)
    }

    const project = await Project.create({
      userId: req.user.id,
      projectName: projectName.trim(),
      projectDescription: projectDescription.trim(),
      originalFileName: '',
      filePath: '',
      status: 'created'
    })

    return sendSuccess(res, 'Project created successfully.', project, 201)
  } catch (err) {
    next(err)
  }
}

export async function addSrsToProject(req, res, next) {
  try {
    const { projectId } = req.params

    if (!isValidObjectId(projectId)) {
      throw new ApiError('Invalid project ID format.', 400)
    }

    if (!req.file) {
      throw new ApiError('No file uploaded. Send a PDF or DOCX file with field name "srs".', 400)
    }

    const project = await Project.findById(projectId)
    if (!project) {
      throw new ApiError('Project not found.', 404)
    }

    if (project.userId && project.userId.toString() !== req.user.id) {
      throw new ApiError('Access denied. You do not own this project.', 403)
    }

    const parsedText = await parseFile(req.file.path)

    const newSrsDoc = {
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      parsedText
    }

    project.srsDocuments.push(newSrsDoc)
    project.originalFileName = req.file.originalname
    project.filePath = req.file.path
    project.parsedText = parsedText
    project.documentName = req.file.originalname
    project.status = 'uploaded'

    await project.save()

    return sendSuccess(res, 'SRS document uploaded successfully.', project)
  } catch (err) {
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

export async function createProject(req, res, next) {
  try {
    const { projectName, projectDescription } = req.body

    if (!req.file) {
      throw new ApiError('No file uploaded. Send a PDF or DOCX file with field name "srs".', 400)
    }

    const parsedText = await parseFile(req.file.path)

    const srsDoc = {
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      parsedText
    }

    const project = await Project.create({
      userId: req.user.id,
      projectName: projectName || 'Untitled Project',
      projectDescription: projectDescription || '',
      documentName: req.file.originalname,
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      parsedText,
      srsDocuments: [srsDoc],
      status: 'uploaded'
    })

    return sendSuccess(res, 'Project created successfully.', project, 201)
  } catch (err) {
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

export async function getProjects(req, res, next) {
  try {
    const projects = await Project.find({
      $or: [
        { userId: req.user.id },
        { userId: { $exists: false } }
      ]
    })
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

    return sendSuccess(res, 'Projects fetched successfully.', projectsWithDetails)
  } catch (err) {
    next(err)
  }
}

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

    if (project.userId && project.userId.toString() !== req.user.id) {
      throw new ApiError('Access denied. You do not own this project.', 403)
    }

    const [requirementAnalyses, testSuites] = await Promise.all([
      RequirementAnalysis.find({ projectId }).lean(),
      TestSuite.find({ projectId }).lean()
    ])

    return sendSuccess(res, 'Project fetched successfully.', {
      project,
      requirementAnalyses,
      testSuites
    })
  } catch (err) {
    next(err)
  }
}

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

    if (project.userId && project.userId.toString() !== req.user.id) {
      throw new ApiError('Access denied. You do not own this project.', 403)
    }

    const allFiles = [
      ...(project.srsDocuments || []).map(d => d.filePath),
      project.filePath
    ].filter(Boolean)

    for (const filePath of allFiles) {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath)
        } catch (err) {
          console.warn(`[PROJECT CONTROLLER] Failed to delete file at ${filePath}:`, err.message)
        }
      }
    }

    await Promise.all([
      Project.findByIdAndDelete(projectId),
      RequirementAnalysis.deleteMany({ projectId }),
      TestSuite.deleteMany({ projectId })
    ])

    return sendSuccess(res, 'Project and all associated data deleted successfully.')
  } catch (err) {
    next(err)
  }
}
