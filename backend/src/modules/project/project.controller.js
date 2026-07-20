import fs from 'fs'
import mongoose from 'mongoose'
import Project from './project.model.js'
import RequirementAnalysis from '../requirement/requirement.model.js'
import TestSuite from '../testsuite/testsuite.model.js'
import { parseFile } from '../../shared/fileParser.service.js'
import { ApiError } from '../../utils/apiError.js'
import { sendSuccess } from '../../utils/responseHelper.js'
import { encrypt, decrypt } from '../../utils/cryptoHelper.js'

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

export async function connectJira(req, res, next) {
  try {
    const { host, email, token, projectKey } = req.body
    const project = req.project

    if (!host || !email || !token || !projectKey) {
      throw new ApiError('All Jira fields (host, email, token, projectKey) are required.', 400)
    }

    // Format host URL
    let formattedHost = host.trim()
    if (!formattedHost.startsWith('http://') && !formattedHost.startsWith('https://')) {
      formattedHost = 'https://' + formattedHost
    }
    // Remove trailing slash if present
    if (formattedHost.endsWith('/')) {
      formattedHost = formattedHost.slice(0, -1)
    }

    // Test connection to Jira (fetch project by key)
    const authString = Buffer.from(`${email.trim()}:${token.trim()}`).toString('base64')
    const testUrl = `${formattedHost}/rest/api/3/project/${projectKey.trim()}`
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        }
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Jira returned status ${response.status}: ${errorText || response.statusText}`)
      }
    } catch (connErr) {
      throw new ApiError(`Failed to connect to Jira: ${connErr.message}`, 400)
    }

    // Save encrypted credentials
    project.jiraHost = formattedHost
    project.jiraEmail = email.trim()
    project.jiraToken = encrypt(token.trim())
    project.jiraProjectKey = projectKey.trim()
    project.jiraConnected = true

    await project.save()

    return sendSuccess(res, 'Connected to Jira successfully.', {
      jiraHost: project.jiraHost,
      jiraEmail: project.jiraEmail,
      jiraProjectKey: project.jiraProjectKey,
      jiraConnected: project.jiraConnected
    })
  } catch (err) {
    next(err)
  }
}

function parseADF(node) {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text' && node.text) {
    return node.text
  }
  let text = ''
  if (node.content && Array.isArray(node.content)) {
    text += node.content.map(parseADF).join('')
  }
  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'bulletList' || node.type === 'listItem') {
    text += '\n'
  }
  return text
}

export async function getJiraIssues(req, res, next) {
  try {
    const project = req.project
    if (!project.jiraConnected || !project.jiraToken) {
      throw new ApiError('Jira is not connected to this project.', 400)
    }

    const { search = '' } = req.query
    const decryptedToken = decrypt(project.jiraToken)
    const authString = Buffer.from(`${project.jiraEmail}:${decryptedToken}`).toString('base64')

    let jql = `project = "${project.jiraProjectKey}" AND issuetype in (Story, Task, Bug)`
    if (search.trim()) {
      jql += ` AND (summary ~ "${search.trim()}" OR description ~ "${search.trim()}")`
    }
    jql += ' ORDER BY created DESC'

    const searchUrl = `${project.jiraHost}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,description`
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(`Jira API error: ${response.status} - ${errorText}`, 400)
    }

    const data = await response.json()
    const issues = (data.issues || []).map(issue => {
      const rawDesc = issue.fields.description
      const parsedDesc = parseADF(rawDesc)

      return {
        key: issue.key,
        id: issue.id,
        title: issue.fields.summary || '',
        description: parsedDesc
      }
    })

    return sendSuccess(res, 'Jira issues fetched successfully.', issues)
  } catch (err) {
    next(err)
  }
}

export async function importJiraStories(req, res, next) {
  try {
    const project = req.project
    const { issueKeys } = req.body

    if (!issueKeys || !Array.isArray(issueKeys) || issueKeys.length === 0) {
      throw new ApiError('An array of issueKeys is required to import.', 400)
    }

    if (!project.jiraConnected || !project.jiraToken) {
      throw new ApiError('Jira is not connected to this project.', 400)
    }

    const decryptedToken = decrypt(project.jiraToken)
    const authString = Buffer.from(`${project.jiraEmail}:${decryptedToken}`).toString('base64')

    // Fetch details for the selected issue keys
    const jql = `key in (${issueKeys.map(k => `"${k}"`).join(',')})`
    const searchUrl = `${project.jiraHost}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary,description`

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(`Jira API error during import: ${response.status} - ${errorText}`, 400)
    }

    const data = await response.json()
    const fetchedIssues = data.issues || []

    if (fetchedIssues.length === 0) {
      throw new ApiError('No matching stories found in your Jira project.', 404)
    }

    // Format stories into a virtual SRS text document
    let combinedText = `JIRA IMPORTED STORIES\n`
    combinedText += `=====================\n\n`
    combinedText += `Imported At: ${new Date().toLocaleString()}\n`
    combinedText += `Jira Instance: ${project.jiraHost}\n`
    combinedText += `Project Key: ${project.jiraProjectKey}\n\n`

    for (const issue of fetchedIssues) {
      const key = issue.key
      const title = issue.fields.summary || 'Untitled Story'
      const desc = parseADF(issue.fields.description)
      
      combinedText += `STORY: ${key}\n`
      combinedText += `TITLE: ${title}\n`
      combinedText += `DESCRIPTION:\n${desc || 'No description provided.'}\n`
      combinedText += `--------------------------------------------------\n\n`
    }

    // Append as virtual SRS document
    const newDoc = {
      originalFileName: `Jira Import (${issueKeys.join(', ')})`,
      filePath: 'virtual://jira',
      parsedText: combinedText,
      uploadedAt: new Date()
    }

    project.srsDocuments.push(newDoc)
    project.status = 'uploaded'
    await project.save()

    return sendSuccess(res, 'Jira stories imported successfully.', project)
  } catch (err) {
    next(err)
  }
}

export async function connectLinear(req, res, next) {
  try {
    let { apiKey, teamId } = req.body
    const project = req.project

    let trimmedKey = (apiKey || '').trim()
    let trimmedTeam = (teamId || '').trim()

    // Fallback to environment variables if not provided
    if (!trimmedKey) {
      trimmedKey = (process.env.LINEAR_API_KEY || '').trim()
    }
    if (!trimmedTeam) {
      trimmedTeam = (process.env.LINEAR_TEAM_ID || '').trim()
    }

    if (!trimmedKey || !trimmedTeam) {
      throw new ApiError('Both Linear API Key and Team Key/ID are required.', 400)
    }

    // Test connection to Linear GraphQL API
    const graphqlQuery = {
      query: `
        query VerifyLinear($teamKey: String!) {
          viewer {
            id
            name
          }
          teams(filter: { key: { eqIgnoreCase: $teamKey } }) {
            nodes {
              id
              key
              name
            }
          }
        }
      `,
      variables: { teamKey: trimmedTeam }
    }

    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': trimmedKey
        },
        body: JSON.stringify(graphqlQuery)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Linear returned HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0].message)
      }

      const matchedTeam = result.data?.teams?.nodes?.[0]
      if (!matchedTeam) {
        throw new Error(`Team with Key "${trimmedTeam}" was not found or is inaccessible.`)
      }
    } catch (connErr) {
      throw new ApiError(`Failed to connect to Linear: ${connErr.message}`, 400)
    }

    // Save encrypted credentials
    project.linearApiKey = encrypt(trimmedKey)
    project.linearTeamId = trimmedTeam
    project.linearConnected = true

    await project.save()

    return sendSuccess(res, 'Connected to Linear workspace successfully.', {
      linearTeamId: project.linearTeamId,
      linearConnected: project.linearConnected
    })
  } catch (err) {
    next(err)
  }
}

export async function getLinearIssues(req, res, next) {
  try {
    const project = req.project
    const activeKey = (project.linearApiKey ? decrypt(project.linearApiKey) : '') || process.env.LINEAR_API_KEY || ''
    const activeTeam = project.linearTeamId || process.env.LINEAR_TEAM_ID || 'NIO'

    if (!activeKey) {
      throw new ApiError('Linear is not connected to this project.', 400)
    }

    const { search = '' } = req.query

    const graphqlQuery = {
      query: `
        query GetLinearIssues($teamKey: String!) {
          teams(filter: { key: { eqIgnoreCase: $teamKey } }) {
            nodes {
              id
              key
              name
              issues(first: 50, orderBy: updatedAt) {
                nodes {
                  id
                  identifier
                  title
                  description
                  priority
                  state {
                    name
                  }
                }
              }
            }
          }
        }
      `,
      variables: { teamKey: activeTeam }
    }

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': activeKey
      },
      body: JSON.stringify(graphqlQuery)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(`Linear API error: ${response.status} - ${errorText}`, 400)
    }

    const result = await response.json()
    if (result.errors && result.errors.length > 0) {
      throw new ApiError(`Linear API error: ${result.errors[0].message}`, 400)
    }

    const matchedTeam = result.data?.teams?.nodes?.[0]
    const rawIssues = matchedTeam?.issues?.nodes || []
    
    let filtered = rawIssues
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      filtered = rawIssues.filter(issue => 
        issue.identifier.toLowerCase().includes(s) ||
        issue.title.toLowerCase().includes(s) ||
        (issue.description && issue.description.toLowerCase().includes(s))
      )
    }

    const issues = filtered.map(issue => ({
      key: issue.identifier,
      id: issue.id,
      title: issue.title || '',
      description: issue.description || '',
      state: issue.state?.name || 'Backlog',
      priority: issue.priority
    }))

    return sendSuccess(res, 'Linear issues fetched successfully.', issues)
  } catch (err) {
    next(err)
  }
}

export async function importLinearStories(req, res, next) {
  try {
    const project = req.project
    const { issueKeys } = req.body

    if (!issueKeys || !Array.isArray(issueKeys) || issueKeys.length === 0) {
      throw new ApiError('An array of issue keys is required to import.', 400)
    }

    const activeKey = (project.linearApiKey ? decrypt(project.linearApiKey) : '') || process.env.LINEAR_API_KEY || ''
    const activeTeam = project.linearTeamId || process.env.LINEAR_TEAM_ID || 'NIO'

    if (!activeKey) {
      throw new ApiError('Linear is not connected to this project.', 400)
    }

    const graphqlQuery = {
      query: `
        query GetLinearIssuesForImport($teamKey: String!) {
          teams(filter: { key: { eqIgnoreCase: $teamKey } }) {
            nodes {
              issues(first: 100) {
                nodes {
                  id
                  identifier
                  title
                  description
                }
              }
            }
          }
        }
      `,
      variables: { teamKey: activeTeam }
    }

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': activeKey
      },
      body: JSON.stringify(graphqlQuery)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(`Linear API error during import: ${response.status} - ${errorText}`, 400)
    }

    const result = await response.json()
    if (result.errors && result.errors.length > 0) {
      throw new ApiError(`Linear API error: ${result.errors[0].message}`, 400)
    }

    const matchedTeam = result.data?.teams?.nodes?.[0]
    const allIssues = matchedTeam?.issues?.nodes || []
    const selectedIssues = allIssues.filter(issue => 
      issueKeys.includes(issue.identifier) || issueKeys.includes(issue.id)
    )

    if (selectedIssues.length === 0) {
      throw new ApiError('No matching stories found in your Linear workspace.', 404)
    }

    let combinedText = `LINEAR IMPORTED STORIES\n`
    combinedText += `======================\n\n`
    combinedText += `Imported At: ${new Date().toLocaleString()}\n`
    combinedText += `Team Key/ID: ${project.linearTeamId}\n\n`

    for (const issue of selectedIssues) {
      combinedText += `STORY: ${issue.identifier}\n`
      combinedText += `TITLE: ${issue.title || 'Untitled Story'}\n`
      combinedText += `DESCRIPTION:\n${issue.description || 'No description provided.'}\n`
      combinedText += `--------------------------------------------------\n\n`
    }

    const newDoc = {
      originalFileName: `Linear Import (${issueKeys.join(', ')})`,
      filePath: 'virtual://linear',
      parsedText: combinedText,
      uploadedAt: new Date()
    }

    project.srsDocuments.push(newDoc)
    project.status = 'uploaded'
    await project.save()

    return sendSuccess(res, 'Linear stories imported successfully.', project)
  } catch (err) {
    next(err)
  }
}

