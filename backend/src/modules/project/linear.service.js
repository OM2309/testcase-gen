import { projectRepository } from './project.repository.js'
import { ApiError } from '../../utils/apiError.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'
import { encrypt, decrypt } from '../../utils/cryptoHelper.js'

export class LinearService {
  constructor(projectRepo = projectRepository) {
    this.projectRepo = projectRepo
  }

  async connectLinear(project, { apiKey, teamId }) {
    let trimmedKey = (apiKey || '').trim() || (process.env.LINEAR_API_KEY || '').trim()
    let trimmedTeam = (teamId || '').trim() || (process.env.LINEAR_TEAM_ID || '').trim()

    if (!trimmedKey || !trimmedTeam) {
      throw new ValidationError('Both Linear API Key and Team Key/ID are required.')
    }

    const graphqlQuery = {
      query: `
        query VerifyLinear($teamKey: String!) {
          viewer { id name }
          teams(filter: { key: { eqIgnoreCase: $teamKey } }) {
            nodes { id key name }
          }
        }
      `,
      variables: { teamKey: trimmedTeam },
    }

    try {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: trimmedKey },
        body: JSON.stringify(graphqlQuery),
      })
      if (!response.ok) throw new Error(`Linear HTTP ${response.status}`)
      const result = await response.json()
      if (result.errors?.length) throw new Error(result.errors[0].message)
      if (!result.data?.teams?.nodes?.[0]) throw new Error(`Team "${trimmedTeam}" not found.`)
    } catch (err) {
      throw new ApiError(`Failed to connect to Linear: ${err.message}`, 400)
    }

    project.linearApiKey = encrypt(trimmedKey)
    project.linearTeamId = trimmedTeam
    project.linearConnected = true

    await this.projectRepo.save(project)
    return { linearTeamId: project.linearTeamId, linearConnected: project.linearConnected }
  }

  async getLinearIssues(project, search = '') {
    const activeKey = (project.linearApiKey ? decrypt(project.linearApiKey) : '') || process.env.LINEAR_API_KEY || ''
    const activeTeam = project.linearTeamId || process.env.LINEAR_TEAM_ID || 'NIO'

    if (!activeKey) throw new ApiError('Linear is not connected to this project.', 400)

    const graphqlQuery = {
      query: `
        query GetLinearIssues($teamKey: String!) {
          teams(filter: { key: { eqIgnoreCase: $teamKey } }) {
            nodes {
              issues(first: 50, orderBy: updatedAt) {
                nodes { id identifier title description priority state { name } }
              }
            }
          }
        }
      `,
      variables: { teamKey: activeTeam },
    }

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: activeKey },
      body: JSON.stringify(graphqlQuery),
    })

    if (!response.ok) throw new ApiError(`Linear API error: ${response.status}`, 400)
    const result = await response.json()
    if (result.errors?.length) throw new ApiError(`Linear error: ${result.errors[0].message}`, 400)

    const rawIssues = result.data?.teams?.nodes?.[0]?.issues?.nodes || []
    let filtered = rawIssues
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      filtered = rawIssues.filter((i) =>
        i.identifier.toLowerCase().includes(s) ||
        i.title.toLowerCase().includes(s) ||
        (i.description && i.description.toLowerCase().includes(s))
      )
    }

    return filtered.map((i) => ({
      key: i.identifier,
      id: i.id,
      title: i.title || '',
      description: i.description || '',
      state: i.state?.name || 'Backlog',
      priority: i.priority,
    }))
  }

  async importLinearStories(project, issueKeys) {
    if (!issueKeys || !Array.isArray(issueKeys) || issueKeys.length === 0) {
      throw new ValidationError('An array of issue keys is required to import.')
    }

    const activeKey = (project.linearApiKey ? decrypt(project.linearApiKey) : '') || process.env.LINEAR_API_KEY || ''
    const activeTeam = project.linearTeamId || process.env.LINEAR_TEAM_ID || 'NIO'
    if (!activeKey) throw new ApiError('Linear is not connected to this project.', 400)

    const graphqlQuery = {
      query: `
        query GetLinearIssuesForImport($teamKey: String!) {
          teams(filter: { key: { eqIgnoreCase: $teamKey } }) {
            nodes {
              issues(first: 100) { nodes { id identifier title description } }
            }
          }
        }
      `,
      variables: { teamKey: activeTeam },
    }

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: activeKey },
      body: JSON.stringify(graphqlQuery),
    })

    if (!response.ok) throw new ApiError(`Linear API error during import: ${response.status}`, 400)
    const result = await response.json()
    if (result.errors?.length) throw new ApiError(`Linear API error: ${result.errors[0].message}`, 400)

    const allIssues = result.data?.teams?.nodes?.[0]?.issues?.nodes || []
    const selectedIssues = allIssues.filter((i) => issueKeys.includes(i.identifier) || issueKeys.includes(i.id))
    if (selectedIssues.length === 0) throw new NotFoundError('No matching stories found in Linear workspace.')

    let combinedText = `LINEAR IMPORTED STORIES\n======================\n\n`
    combinedText += `Imported At: ${new Date().toLocaleString()}\nTeam Key/ID: ${project.linearTeamId}\n\n`

    for (const i of selectedIssues) {
      combinedText += `STORY: ${i.identifier}\nTITLE: ${i.title || 'Untitled Story'}\n`
      combinedText += `DESCRIPTION:\n${i.description || 'No description provided.'}\n`
      combinedText += `--------------------------------------------------\n\n`
    }

    project.srsDocuments.push({
      originalFileName: `Linear Import (${issueKeys.join(', ')})`,
      filePath: 'virtual://linear',
      parsedText: combinedText,
      uploadedAt: new Date(),
    })
    project.status = 'uploaded'
    await this.projectRepo.save(project)
    return project
  }
}

export const linearService = new LinearService()
