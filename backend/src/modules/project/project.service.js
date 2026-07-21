import fs from 'fs'
import mongoose from 'mongoose'
import Project from './project.model.js'
import RequirementAnalysis from '../requirement/requirement.model.js'
import TestSuite from '../testsuite/testsuite.model.js'
import { parseFile } from '../../shared/fileParser.service.js'
import { projectRepository } from './project.repository.js'
import { ForbiddenError, NotFoundError, ValidationError } from '../../errors/index.js'

export class ProjectService {
  constructor(projectRepo = projectRepository) {
    this.projectRepo = projectRepo
  }

  async createProjectOnly(userId, { projectName, projectDescription }) {
    return this.projectRepo.create({
      userId,
      projectName: projectName.trim(),
      projectDescription: (projectDescription || '').trim(),
      originalFileName: '',
      filePath: '',
      status: 'created',
    })
  }

  async createProjectWithSrs(userId, { projectName, projectDescription }, file) {
    if (!file) {
      throw new ValidationError('No file uploaded. Send a PDF or DOCX file with field name "srs".')
    }

    try {
      const parsedText = await parseFile(file.path)
      const srsDoc = {
        originalFileName: file.originalname,
        filePath: file.path,
        parsedText,
      }

      return await this.projectRepo.create({
        userId,
        projectName: projectName || 'Untitled Project',
        projectDescription: projectDescription || '',
        documentName: file.originalname,
        originalFileName: file.originalname,
        filePath: file.path,
        parsedText,
        srsDocuments: [srsDoc],
        status: 'uploaded',
      })
    } catch (err) {
      if (file && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path) } catch (_) {}
      }
      throw err
    }
  }

  async addSrsToProject(project, file) {
    if (!file) {
      throw new ValidationError('No file uploaded. Send a PDF or DOCX file with field name "srs".')
    }

    try {
      const parsedText = await parseFile(file.path)
      const newSrsDoc = {
        originalFileName: file.originalname,
        filePath: file.path,
        parsedText,
      }

      project.srsDocuments.push(newSrsDoc)
      project.originalFileName = file.originalname
      project.filePath = file.path
      project.parsedText = parsedText
      project.documentName = file.originalname
      project.status = 'uploaded'

      return await this.projectRepo.save(project)
    } catch (err) {
      if (file && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path) } catch (_) {}
      }
      throw err
    }
  }

  async getProjects(user, { search = '', page, limit }) {
    let query = {}
    if (user.role !== 'admin') {
      query = {
        $or: [
          { userId: user.id },
          { assignedUsers: user.id },
          { userId: { $exists: false } },
        ],
      }
    }

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i')
      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            { $or: [{ projectName: searchRegex }, { projectDescription: searchRegex }] },
          ],
        }
      } else {
        query = {
          $or: [{ projectName: searchRegex }, { projectDescription: searchRegex }],
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

    const projectsWithDetails = await Promise.all(
      projects.map(async (p) => {
        const suite = await TestSuite.findOne({ projectId: p._id }).select('testCases').lean()
        return {
          ...p,
          hasTestSuite: !!suite,
          testCasesCount: suite ? suite.testCases?.length || 0 : 0,
        }
      })
    )

    return {
      projects: projectsWithDetails,
      totalPages,
      currentPage: pageNum,
      totalCount,
    }
  }

  async getProjectById(projectId) {
    const project = await Project.findById(projectId)
      .populate('assignedUsers', 'username email role')
      .lean()

    if (!project) throw new NotFoundError('Project not found.')

    const [requirementAnalyses, testSuites] = await Promise.all([
      RequirementAnalysis.find({ projectId }).lean(),
      TestSuite.find({ projectId }).lean(),
    ])

    return { project, requirementAnalyses, testSuites }
  }

  async updateProject(project, user, { projectName, projectDescription }) {
    const isOwner = project.userId && project.userId.toString() === user.id
    if (user.role !== 'admin' && !isOwner) {
      throw new ForbiddenError('Access denied. Only the project owner or an admin can update project details.')
    }

    if (projectName && projectName.trim()) {
      project.projectName = projectName.trim()
    }
    if (projectDescription !== undefined) {
      project.projectDescription = projectDescription.trim()
    }

    return this.projectRepo.save(project)
  }

  async deleteProject(project, user) {
    const projectId = project._id
    if (user.role !== 'admin' && project.userId && project.userId.toString() !== user.id) {
      throw new ForbiddenError('Access denied. Only the project owner or an admin can delete this project.')
    }

    const allFiles = [
      ...(project.srsDocuments || []).map((d) => d.filePath),
      project.filePath,
    ].filter(Boolean)

    for (const filePath of allFiles) {
      if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath) } catch (_) {}
      }
    }

    await Promise.all([
      this.projectRepo.findByIdAndDelete(projectId),
      RequirementAnalysis.deleteMany({ projectId }),
      TestSuite.deleteMany({ projectId }),
    ])
  }

  async assignUsers(project, user, userIds) {
    const isOwnerPM = user.role === 'project_manager' && project.userId && project.userId.toString() === user.id
    if (user.role !== 'admin' && !isOwnerPM) {
      throw new ForbiddenError('Access denied. Only admins or the project manager who created the project can assign members.')
    }

    if (!Array.isArray(userIds)) {
      throw new ValidationError('userIds must be an array.')
    }

    const invalidIds = userIds.filter((id) => !mongoose.Types.ObjectId.isValid(id))
    if (invalidIds.length > 0) {
      throw new ValidationError('Invalid user ID formats detected.')
    }

    project.assignedUsers = userIds.map((id) => new mongoose.Types.ObjectId(id))
    return this.projectRepo.save(project)
  }
}

export const projectService = new ProjectService()
