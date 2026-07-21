import { projectService } from './project.service.js'
import { jiraService } from './jira.service.js'
import { linearService } from './linear.service.js'
import { sendSuccess } from '../../utils/responseHelper.js'

export async function createProjectOnly(req, res, next) {
  try {
    const project = await projectService.createProjectOnly(req.user.id, req.body)
    return sendSuccess(res, 'Project created successfully.', project, 201)
  } catch (err) {
    next(err)
  }
}

export async function createProject(req, res, next) {
  try {
    const project = await projectService.createProjectWithSrs(req.user.id, req.body, req.file)
    return sendSuccess(res, 'Project created successfully.', project, 201)
  } catch (err) {
    next(err)
  }
}

export async function addSrsToProject(req, res, next) {
  try {
    const project = await projectService.addSrsToProject(req.project, req.file)
    return sendSuccess(res, 'SRS document uploaded successfully.', project)
  } catch (err) {
    next(err)
  }
}

export async function getProjects(req, res, next) {
  try {
    const result = await projectService.getProjects(req.user, req.query)
    return sendSuccess(res, 'Projects fetched successfully.', result)
  } catch (err) {
    next(err)
  }
}

export async function getProjectById(req, res, next) {
  try {
    const result = await projectService.getProjectById(req.project._id)
    return sendSuccess(res, 'Project fetched successfully.', result)
  } catch (err) {
    next(err)
  }
}

export async function updateProject(req, res, next) {
  try {
    const project = await projectService.updateProject(req.project, req.user, req.body)
    return sendSuccess(res, 'Project updated successfully.', project)
  } catch (err) {
    next(err)
  }
}

export async function deleteProject(req, res, next) {
  try {
    await projectService.deleteProject(req.project, req.user)
    return sendSuccess(res, 'Project and all associated data deleted successfully.')
  } catch (err) {
    next(err)
  }
}

export async function assignUsersToProject(req, res, next) {
  try {
    const project = await projectService.assignUsers(req.project, req.user, req.body.userIds)
    return sendSuccess(res, 'Project members updated successfully.', project)
  } catch (err) {
    next(err)
  }
}

export async function connectJira(req, res, next) {
  try {
    const result = await jiraService.connectJira(req.project, req.body)
    return sendSuccess(res, 'Connected to Jira successfully.', result)
  } catch (err) {
    next(err)
  }
}

export async function getJiraIssues(req, res, next) {
  try {
    const issues = await jiraService.getJiraIssues(req.project, req.query.search)
    return sendSuccess(res, 'Jira issues fetched successfully.', issues)
  } catch (err) {
    next(err)
  }
}

export async function importJiraStories(req, res, next) {
  try {
    const project = await jiraService.importJiraStories(req.project, req.body.issueKeys)
    return sendSuccess(res, 'Jira stories imported successfully.', project)
  } catch (err) {
    next(err)
  }
}

export async function connectLinear(req, res, next) {
  try {
    const result = await linearService.connectLinear(req.project, req.body)
    return sendSuccess(res, 'Connected to Linear workspace successfully.', result)
  } catch (err) {
    next(err)
  }
}

export async function getLinearIssues(req, res, next) {
  try {
    const issues = await linearService.getLinearIssues(req.project, req.query.search)
    return sendSuccess(res, 'Linear issues fetched successfully.', issues)
  } catch (err) {
    next(err)
  }
}

export async function importLinearStories(req, res, next) {
  try {
    const project = await linearService.importLinearStories(req.project, req.body.issueKeys)
    return sendSuccess(res, 'Linear stories imported successfully.', project)
  } catch (err) {
    next(err)
  }
}
