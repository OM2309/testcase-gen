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
    if (!req.file) {
      throw new ApiError('No file uploaded. Send a PDF or DOCX file with field name "srs".', 400)
    }

    const project = req.project

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
    const { search = '', page, limit } = req.query

    let query = {}

    // Base role constraints
    if (req.user.role !== 'admin') {
      query = {
        $or: [
          { userId: req.user.id },
          { assignedUsers: req.user.id },
          { userId: { $exists: false } }
        ]
      }
    }

    // Append search constraints
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i')
      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            {
              $or: [
                { projectName: searchRegex },
                { projectDescription: searchRegex }
              ]
            }
          ]
        }
      } else {
        query = {
          $or: [
            { projectName: searchRegex },
            { projectDescription: searchRegex }
          ]
        }
      }
    }

    const totalCount = await Project.countDocuments(query)
    const limitNum = limit ? parseInt(limit, 10) : (page ? 6 : totalCount || 1)
    const pageNum = parseInt(page, 10) || 1
    const skip = (pageNum - 1) * limitNum
    const totalPages = Math.ceil(totalCount / limitNum) || 1

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('assignedUsers', 'username email role')
      .lean()

    const projectsWithDetails = await Promise.all(projects.map(async (project) => {
      const suite = await TestSuite.findOne({ projectId: project._id }).select('testCases').lean()
      return {
        ...project,
        hasTestSuite: !!suite,
        testCasesCount: suite ? suite.testCases?.length || 0 : 0
      }
    }))

    return sendSuccess(res, 'Projects fetched successfully.', {
      projects: projectsWithDetails,
      totalPages,
      currentPage: pageNum,
      totalCount
    })
  } catch (err) {
    next(err)
  }
}

export async function getProjectById(req, res, next) {
  try {
    const project = await Project.findById(req.project._id)
      .populate('assignedUsers', 'username email role')
      .lean()

    const [requirementAnalyses, testSuites] = await Promise.all([
      RequirementAnalysis.find({ projectId: project._id }).lean(),
      TestSuite.find({ projectId: project._id }).lean()
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
    const project = req.project
    const projectId = project._id

    // Only Admin or the project creator can delete
    if (req.user.role !== 'admin' && project.userId && project.userId.toString() !== req.user.id) {
      throw new ApiError('Access denied. Only the project owner or an admin can delete this project.', 403)
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

export async function assignUsersToProject(req, res, next) {
  try {
    const { userIds } = req.body
    const project = req.project

    // Only Admin or the project owner PM can assign users
    const isOwnerPM = req.user.role === 'project_manager' && project.userId && project.userId.toString() === req.user.id
    if (req.user.role !== 'admin' && !isOwnerPM) {
      throw new ApiError('Access denied. Only admins or the project manager who created the project can assign members.', 403)
    }

    if (!Array.isArray(userIds)) {
      throw new ApiError('userIds must be an array.', 400)
    }

    const invalidIds = userIds.filter(id => !isValidObjectId(id))
    if (invalidIds.length > 0) {
      throw new ApiError('Invalid user ID formats detected.', 400)
    }

    project.assignedUsers = userIds.map(id => new mongoose.Types.ObjectId(id))
    await project.save()

    return sendSuccess(res, 'Project members updated successfully.', project)
  } catch (err) {
    next(err)
  }
}

export async function updateProject(req, res, next) {
  try {
    const { projectName, projectDescription } = req.body
    const project = req.project

    // Only Admin or the project creator PM can update metadata
    const isOwner = project.userId && project.userId.toString() === req.user.id
    if (req.user.role !== 'admin' && !isOwner) {
      throw new ApiError('Access denied. Only the project owner or an admin can update project details.', 403)
    }

    if (projectName && projectName.trim()) {
      project.projectName = projectName.trim()
    }
    if (projectDescription !== undefined) {
      project.projectDescription = projectDescription.trim()
    }

    await project.save()

    return sendSuccess(res, 'Project updated successfully.', project)
  } catch (err) {
    next(err)
  }
}
