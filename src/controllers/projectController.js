import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { sendSuccess, sendError, sendPaginated, parsePagination } from '../utils/responseHelper.js'
import { listProjectFiles, deleteProjectDir, zipProjectDir, getProjectDirByFolder } from '../utils/fileSystem.js'
import Project from '../models/Project.js'
import TestCase from '../models/TestCase.js'

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

export async function getProjectStatus(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 'Invalid project ID format.', 400)
    }

    const project = await Project.findById(req.params.id).select(
      'projectName projectDescription status totalTestCases totalModules folderName errorMessage processingStartedAt processingCompletedAt createdAt'
    )

    if (!project) {
      return sendError(res, 'Project not found.', 404)
    }

    if (project.status === 'completed') {
      const protocol = req.protocol
      const host = req.get('host')
      const baseUrl = `${protocol}://${host}/public/${project.folderName}`
      const files = listProjectFiles(project.folderName)
      const filesWithUrls = files.map(f => ({
        fileName: f.fileName,
        publicUrl: f.publicUrl,
        absoluteUrl: `${protocol}://${host}${f.publicUrl}`
      }))

      return sendSuccess(res, {
        data: project,
        folderName: project.folderName,
        baseUrl,
        files: filesWithUrls
      })
    } else {
      return sendSuccess(res, {
        data: project,
        folderName: null,
        baseUrl: null,
        files: null
      })
    }

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

export async function getProjectFiles(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 'Invalid project ID format.', 400)
    }

    const project = await Project.findById(req.params.id).select('folderName status')

    if (!project) {
      return sendError(res, 'Project not found.', 404)
    }

    if (!project.folderName) {
      return sendError(res, `Files not yet available. Current status: ${project.status}`, 404)
    }

    const files = listProjectFiles(project.folderName)

    return sendSuccess(res, {
      data: files,
      folderName: project.folderName,
      total: files.length
    })

  } catch (err) {
    console.error('[FILES] Error:', err.message)
    return sendError(res, 'Failed to fetch generated files.')
  }
}

export async function downloadProjectFiles(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 'Invalid project ID format.', 400)
    }

    const project = await Project.findById(req.params.id).select('folderName projectName status')

    if (!project) {
      return sendError(res, 'Project not found.', 404)
    }

    if (!project.folderName) {
      return sendError(res, `Files not yet available. Current status: ${project.status}`, 404)
    }

    const zipFileName = `${project.folderName}.zip`

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`)

    await zipProjectDir(project.folderName, res)

  } catch (err) {
    console.error('[DOWNLOAD] Error:', err.message)

    if (!res.headersSent) {
      return sendError(res, err.message || 'Failed to download project files.')
    }
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
        .select('projectName originalFileName status totalTestCases totalModules folderName createdAt processingCompletedAt')
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

    await Promise.all([
      TestCase.deleteMany({ projectId: req.params.id }),
      Project.findByIdAndDelete(req.params.id)
    ])

    deleteProjectDir(project.folderName)

    return sendSuccess(res, { message: 'Project and all associated data deleted.' })

  } catch (err) {
    console.error('[DELETE] Error:', err.message)
    return sendError(res, 'Failed to delete project.')
  }
}

export async function viewProjectFile(req, res) {
  try {
    if (!isValidObjectId(req.params.id)) {
      return sendError(res, 'Invalid project ID format.', 400)
    }

    const project = await Project.findById(req.params.id).select('folderName status projectName')

    if (!project) {
      return sendError(res, 'Project not found.', 404)
    }

    if (!project.folderName) {
      return sendError(res, `Files not yet available. Current status: ${project.status}`, 404)
    }

    const { file, raw } = req.query

    const protocol = req.protocol
    const host = req.get('host')
    const baseUrl = `${protocol}://${host}/public/${project.folderName}`

    if (!file) {
      const files = listProjectFiles(project.folderName)
      const filesWithUrls = files.map(f => ({
        fileName: f.fileName,
        publicUrl: f.publicUrl,
        absoluteUrl: `${protocol}://${host}${f.publicUrl}`
      }))

      return sendSuccess(res, {
        folderName: project.folderName,
        baseUrl,
        files: filesWithUrls
      })
    }

    const sanitizedFile = path.basename(file)
    if (sanitizedFile !== file) {
      return sendError(res, 'Invalid file name. Directory traversal is not allowed.', 400)
    }

    const projectDir = getProjectDirByFolder(project.folderName)
    const filePath = path.join(projectDir, sanitizedFile)

    if (!fs.existsSync(filePath)) {
      return sendError(res, 'Requested file not found in project directory.', 404)
    }

    if (raw === 'true') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      return res.sendFile(filePath)
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    return sendSuccess(res, {
      fileName: sanitizedFile,
      content
    })

  } catch (err) {
    console.error('[VIEW FILE] Error:', err.message)
    return sendError(res, 'Failed to view project file.')
  }
}
