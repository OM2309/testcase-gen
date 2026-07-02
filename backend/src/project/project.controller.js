import fs from 'fs'
import mongoose from 'mongoose'
import { parseFile } from '../utils/fileParser.js'
import { sendSuccess, sendError, sendPaginated, parsePagination } from '../utils/responseHelper.js'
import Project from './project.model.js'

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

export async function uploadSRS(req, res) {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded. Send a PDF or DOCX file with field name "srs".', 400)
    }

    const srsText = await parseFile(req.file.path)

    const project = await Project.create({
      originalFileName: req.file.originalname,
      filePath: req.file.path,
      parsedText: srsText,
      status: 'uploaded'
    })

    return sendSuccess(res, {
      documentId: project._id,
      fileName: req.file.originalname,
      text: srsText
    }, 201)

  } catch (err) {
    console.error('[UPLOAD] Error:', err.message)

    if (err.message.includes('Invalid file type')) {
      return sendError(res, err.message, 415)
    }

    if (err.message.includes('empty')) {
      return sendError(res, err.message, 422)
    }

    return sendError(res, 'Internal server error during upload.')
  }
}

export async function getProjectStatus(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 'Invalid project ID format.', 400)
    }

    const project = await Project.findById(req.params.id).select(
      'projectName projectDescription documentName status totalModules errorMessage processingStartedAt processingCompletedAt createdAt'
    )

    if (!project) {
      return sendError(res, 'Project not found.', 404)
    }

    return sendSuccess(res, {
      data: project
    })

  } catch (err) {
    console.error('[STATUS] Error:', err.message)
    return sendError(res, 'Failed to fetch project status.')
  }
}

export async function getProjectAnalysis(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 'Invalid project ID format.', 400)
    }

    const project = await Project.findById(req.params.id).select('analyzedData status projectName')

    if (!project) {
      return sendError(res, 'Project not found.', 404)
    }

    if (!project.analyzedData) {
      return sendError(res, `Analysis not yet available. Current status: ${project.status}`, 404)
    }

    return sendSuccess(res, { data: project.analyzedData })

  } catch (err) {
    console.error('[ANALYSIS] Error:', err.message)
    return sendError(res, 'Failed to fetch analysis data.')
  }
}

export async function getAllProjects(req, res) {
  try {
    const { status } = req.query
    const { page, limit, skip } = parsePagination(req.query)

    const filter = {}
    if (status) filter.status = status

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .select('projectName originalFileName documentName status totalModules createdAt processingCompletedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Project.countDocuments(filter)
    ])

    return sendPaginated(res, projects, total, page, limit)

  } catch (err) {
    console.error('[PROJECTS] Error:', err.message)
    return sendError(res, 'Failed to fetch projects.')
  }
}

export async function deleteProject(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 'Invalid project ID format.', 400)
    }

    const project = await Project.findById(req.params.id)
    if (!project) {
      return sendError(res, 'Project not found.', 404)
    }

    if (project.filePath && fs.existsSync(project.filePath)) {
      try {
        fs.unlinkSync(project.filePath)
      } catch (err) {
        console.warn(`[DELETE] Failed to delete SRS file at ${project.filePath}:`, err.message)
      }
    }

    await Project.findByIdAndDelete(req.params.id)

    return sendSuccess(res, { message: 'Project and all associated data deleted.' })

  } catch (err) {
    console.error('[DELETE] Error:', err.message)
    return sendError(res, 'Failed to delete project.')
  }
}
