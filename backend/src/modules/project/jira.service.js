import { projectRepository } from './project.repository.js'
import { ApiError } from '../../utils/apiError.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'
import { encrypt, decrypt } from '../../utils/cryptoHelper.js'

function parseADF(node) {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text' && node.text) return node.text
  let text = ''
  if (node.content && Array.isArray(node.content)) {
    text += node.content.map(parseADF).join('')
  }
  if (['paragraph', 'heading', 'bulletList', 'listItem'].includes(node.type)) {
    text += '\n'
  }
  return text
}

export class JiraService {
  constructor(projectRepo = projectRepository) {
    this.projectRepo = projectRepo
  }

  async connectJira(project, { host, email, token, projectKey }) {
    let formattedHost = host.trim()
    if (!formattedHost.startsWith('http://') && !formattedHost.startsWith('https://')) {
      formattedHost = 'https://' + formattedHost
    }
    if (formattedHost.endsWith('/')) {
      formattedHost = formattedHost.slice(0, -1)
    }

    const authString = Buffer.from(`${email.trim()}:${token.trim()}`).toString('base64')
    const testUrl = `${formattedHost}/rest/api/3/project/${projectKey.trim()}`

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { Authorization: `Basic ${authString}`, Accept: 'application/json' },
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Jira returned status ${response.status}: ${errorText || response.statusText}`)
      }
    } catch (connErr) {
      throw new ApiError(`Failed to connect to Jira: ${connErr.message}`, 400)
    }

    project.jiraHost = formattedHost
    project.jiraEmail = email.trim()
    project.jiraToken = encrypt(token.trim())
    project.jiraProjectKey = projectKey.trim()
    project.jiraConnected = true

    await this.projectRepo.save(project)

    return {
      jiraHost: project.jiraHost,
      jiraEmail: project.jiraEmail,
      jiraProjectKey: project.jiraProjectKey,
      jiraConnected: project.jiraConnected,
    }
  }

  async getJiraIssues(project, search = '') {
    if (!project.jiraConnected || !project.jiraToken) {
      throw new ApiError('Jira is not connected to this project.', 400)
    }

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
      headers: { Authorization: `Basic ${authString}`, Accept: 'application/json' },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(`Jira API error: ${response.status} - ${errorText}`, 400)
    }

    const data = await response.json()
    return (data.issues || []).map((issue) => ({
      key: issue.key,
      id: issue.id,
      title: issue.fields.summary || '',
      description: parseADF(issue.fields.description),
    }))
  }

  async importJiraStories(project, issueKeys) {
    if (!issueKeys || !Array.isArray(issueKeys) || issueKeys.length === 0) {
      throw new ValidationError('An array of issueKeys is required to import.')
    }

    if (!project.jiraConnected || !project.jiraToken) {
      throw new ApiError('Jira is not connected to this project.', 400)
    }

    const decryptedToken = decrypt(project.jiraToken)
    const authString = Buffer.from(`${project.jiraEmail}:${decryptedToken}`).toString('base64')

    const jql = `key in (${issueKeys.map((k) => `"${k}"`).join(',')})`
    const searchUrl = `${project.jiraHost}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=summary,description`

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: { Authorization: `Basic ${authString}`, Accept: 'application/json' },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(`Jira API error during import: ${response.status} - ${errorText}`, 400)
    }

    const data = await response.json()
    const fetchedIssues = data.issues || []
    if (fetchedIssues.length === 0) {
      throw new NotFoundError('No matching stories found in your Jira project.')
    }

    let combinedText = `JIRA IMPORTED STORIES\n=====================\n\n`
    combinedText += `Imported At: ${new Date().toLocaleString()}\n`
    combinedText += `Jira Instance: ${project.jiraHost}\n`
    combinedText += `Project Key: ${project.jiraProjectKey}\n\n`

    for (const issue of fetchedIssues) {
      combinedText += `STORY: ${issue.key}\n`
      combinedText += `TITLE: ${issue.fields.summary || 'Untitled Story'}\n`
      combinedText += `DESCRIPTION:\n${parseADF(issue.fields.description) || 'No description provided.'}\n`
      combinedText += `--------------------------------------------------\n\n`
    }

    project.srsDocuments.push({
      originalFileName: `Jira Import (${issueKeys.join(', ')})`,
      filePath: 'virtual://jira',
      parsedText: combinedText,
      uploadedAt: new Date(),
    })
    project.status = 'uploaded'
    await this.projectRepo.save(project)
    return project
  }
}

export const jiraService = new JiraService()
