import Project from '../project/project.model.js'
import User from '../auth/user.model.js'
import { testSuiteRepository } from './testsuite.repository.js'
import { projectRepository } from '../project/project.repository.js'
import { requirementRepository } from '../requirement/requirement.repository.js'
import { notificationService } from '../notification/notification.service.js'
import { runAgent2 } from './testsuite.service.js'
import { callOpenAI } from '../../shared/openai.service.js'
import {
  aiGenerateSystemPrompt,
  buildAiGenerateUserPrompt,
} from './testsuite.aiGenerate.prompt.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'
import { sendMessageToChannel, findSlackUserIdByEmail } from '../slack/slack.service.js'

export const aiUpdateStepsSystemPrompt = `You are an expert QA automation engineer.
You are given an existing automated test case with its steps and details.
The user wants to update the steps and metadata (like expected results or preconditions) based on their instructions and optionally a screenshot showing the page layout.

You must output a JSON object containing the updated fields:
- expected_result: string
- preconditions: array of strings
- steps: array of updated step objects. Each step object must have:
  - step_number: integer
  - action: string
  - target: string
  - value: string
  - description: string
  - expected: string

Format your output strictly as a JSON object with these keys. Do not include markdown code block formatting in your response. Return ONLY the raw JSON object.`

export class TestSuiteService {
  constructor(
    testSuiteRepo = testSuiteRepository,
    projRepo = projectRepository,
    reqRepo = requirementRepository
  ) {
    this.testSuiteRepo = testSuiteRepo
    this.projRepo = projRepo
    this.reqRepo = reqRepo
  }

  async generateTestSuite(projectId, srsDocumentId) {
    const project = await this.projRepo.findById(projectId)
    if (!project) {
      throw new NotFoundError('Project not found')
    }

    const query = { projectId, srsDocumentId: srsDocumentId || null }

    const requirementAnalysis = await this.reqRepo.findOne(query)
    if (!requirementAnalysis || !requirementAnalysis.analyzedData) {
      throw new ValidationError('Requirement analysis not completed yet. Run Agent 1 first.')
    }

    try {
      const testSuiteJson = await runAgent2({
        requirementId: requirementAnalysis._id.toString(),
        requirementJson: requirementAnalysis.analyzedData,
      })

      const suite = await this.testSuiteRepo.findOneAndUpdate(
        { projectId, srsDocumentId: srsDocumentId || null },
        {
          srsDocumentId: srsDocumentId || null,
          suiteName: testSuiteJson.suite_name || 'Automated Test Suite',
          projectName: testSuiteJson.project_name || project.projectName,
          generatedFromRequirementId: requirementAnalysis._id,
          testCases: testSuiteJson.test_cases || [],
        },
        { upsert: true, new: true }
      )

      await Project.findByIdAndUpdate(projectId, { status: 'tests_generated' })
      return suite
    } catch (err) {
      await Project.findByIdAndUpdate(projectId, {
        status: 'failed',
        errorMessage: `Test generation failed: ${err.message}`,
      })
      throw err
    }
  }

  async getTestSuiteByProjectId(projectId) {
    return this.testSuiteRepo.findByProjectId(projectId)
  }

  async updateTestSuite(projectId, suiteId, testCases) {
    const suite = await this.testSuiteRepo.findOneAndUpdate(
      { _id: suiteId, projectId },
      { testCases },
      { new: true }
    )

    if (!suite) {
      throw new NotFoundError('Test suite not found for this project')
    }

    return suite
  }

  async toggleTestCaseRegressive(projectId, suiteId, testCaseId) {
    const suite = await this.testSuiteRepo.findOne({ _id: suiteId, projectId })
    if (!suite) {
      throw new NotFoundError('Test suite not found for this project')
    }

    const testCase = suite.testCases.find((tc) => tc.id === testCaseId)
    if (!testCase) {
      throw new NotFoundError('Test case not found in the suite')
    }

    testCase.isRegressive = !testCase.isRegressive
    await this.testSuiteRepo.save(suite)
    return suite
  }

  async aiGenerateTestCase(projectId, { requirement, module, priority }) {
    const project = await this.projRepo.findById(projectId)
    if (!project) {
      throw new NotFoundError('Project not found')
    }

    const userPrompt = buildAiGenerateUserPrompt({
      requirement: requirement.trim(),
      module: module || 'General',
      priority: priority || 'Medium',
    })

    const testCase = await callOpenAI({
      systemPrompt: aiGenerateSystemPrompt,
      userPrompt,
      temperature: 0.3,
      jsonMode: true,
    })

    if (!testCase.id || testCase.id === 'TC-<timestamp>') {
      testCase.id = `TC-${Date.now()}`
    }

    return testCase
  }

  async aiUpdateTestCaseSteps(projectId, { testCase, instructions, screenshot }) {
    const userPrompt = `Existing Test Case:
Title: ${testCase.title}
Expected Result: ${testCase.expected_result || ''}
Preconditions: ${JSON.stringify(testCase.preconditions || [])}
Current Steps:
${JSON.stringify(testCase.steps || [], null, 2)}

User Instructions: ${instructions.trim()}
${screenshot ? 'Please examine the attached screenshot of the UI state to align selectors and steps.' : ''}

Update the test case steps and expected outcome to match the user's instructions and visual layout.`

    return callOpenAI({
      systemPrompt: aiUpdateStepsSystemPrompt,
      userPrompt,
      temperature: 0.3,
      jsonMode: true,
      image: screenshot || null,
    })
  }

  async requestApproval(projectId, suiteId, userId) {
    const suite = await this.testSuiteRepo.findOne({ _id: suiteId, projectId })
    if (!suite) {
      throw new NotFoundError('Test suite not found for this project')
    }

    const project = await this.projRepo.findById(projectId)
    if (!project) {
      throw new NotFoundError('Project not found')
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }

    suite.approvalStatus = 'pending_approval'
    suite.approvalRequestedBy = userId
    suite.approvalRequestedAt = new Date()

    await this.testSuiteRepo.save(suite)

    // Notify project managers
    const pmRecipients = []
    
    // Add owner if they are project manager or admin
    if (project.userId) {
      const owner = await User.findById(project.userId)
      if (owner && (owner.role === 'project_manager' || owner.role === 'admin')) {
        pmRecipients.push(owner._id.toString())
      }
    }

    // Add any assigned PMs or admins
    if (project.assignedUsers && project.assignedUsers.length > 0) {
      const assignedPMs = await User.find({
        _id: { $in: project.assignedUsers },
        role: { $in: ['project_manager', 'admin'] }
      })
      for (const pm of assignedPMs) {
        if (!pmRecipients.includes(pm._id.toString())) {
          pmRecipients.push(pm._id.toString())
        }
      }
    }

    // Send notification
    for (const recipientId of pmRecipients) {
      await notificationService.createNotification({
        recipientId,
        senderId: userId,
        projectId,
        testSuiteId: suiteId,
        type: 'approval_request',
        message: `User ${user.username} has requested approval for the test suite "${suite.suiteName}" in project "${project.projectName}".`
      })

      // Send Slack message if possible
      try {
        const pmUser = await User.findById(recipientId)
        if (pmUser) {
          let accessToken = null
          let channelId = null

          // Determine whose token and which channel/user ID to use
          if (user.slack?.accessToken) {
            // QA (sender) has Slack connected: send from QA's token to PM's Slack User ID
            accessToken = user.slack.accessToken
            if (pmUser.slack?.userId) {
              channelId = pmUser.slack.userId
            } else {
              // Try to look up PM's Slack user ID by email using QA's token
              channelId = await findSlackUserIdByEmail(accessToken, pmUser.email)
            }
          } else if (pmUser.slack?.accessToken) {
            // QA does not have Slack, but PM does: send from PM's token to PM's own Slack User ID
            accessToken = pmUser.slack.accessToken
            channelId = pmUser.slack.userId
          }

          if (accessToken && channelId) {
            const suiteLink = `http://localhost:3000/dashboard/${projectId}/test-cases` + 
              (suite.srsDocumentId ? `?srsId=${suite.srsDocumentId}` : '')

            const slackText = `*Test Suite Approval Request*
QA *${user.username}* has requested approval for the test suite *${suite.suiteName}* in project *${project.projectName}*.

Please review and approve the test suite here:
${suiteLink}`

            await sendMessageToChannel(accessToken, channelId, slackText)
            console.log(`Slack approval notification successfully sent to PM ${pmUser.username} (${channelId})`)
          }
        }
      } catch (slackErr) {
        console.error('Failed to send Slack approval notification:', slackErr.message)
      }
    }

    return suite
  }

  async submitReview(projectId, suiteId, reviewerId, approvalStatus, commentText) {
    const suite = await this.testSuiteRepo.findOne({ _id: suiteId, projectId })
    if (!suite) {
      throw new NotFoundError('Test suite not found for this project')
    }

    const project = await this.projRepo.findById(projectId)
    if (!project) {
      throw new NotFoundError('Project not found')
    }

    const reviewer = await User.findById(reviewerId)
    if (!reviewer) {
      throw new NotFoundError('Reviewer not found')
    }

    // Add comment to comments array
    suite.comments.push({
      userId: reviewerId,
      userName: reviewer.username,
      role: reviewer.role,
      commentText: commentText.trim(),
      createdAt: new Date()
    })

    // Update approval status
    suite.approvalStatus = approvalStatus
    await this.testSuiteRepo.save(suite)

    // Notify the QA who requested approval
    const qaId = suite.approvalRequestedBy
    if (qaId) {
      const statusLabel = approvalStatus === 'approved' ? 'Approved' : 'Rejected / Request Changes'
      await notificationService.createNotification({
        recipientId: qaId,
        senderId: reviewerId,
        projectId,
        testSuiteId: suiteId,
        type: 'approval_response',
        message: `Project Manager ${reviewer.username} reviewed test suite "${suite.suiteName}" (Status: ${statusLabel}). Feedback: "${commentText}"`
      })

      // Send Slack message back to QA if possible
      try {
        const qaUser = await User.findById(qaId)
        if (qaUser) {
          let accessToken = null
          let channelId = null

          if (reviewer.slack?.accessToken) {
            // PM (sender) has Slack connected: send from PM's token to QA's Slack User ID
            accessToken = reviewer.slack.accessToken
            if (qaUser.slack?.userId) {
              channelId = qaUser.slack.userId
            } else {
              // Try to look up QA's Slack user ID by email using PM's token
              channelId = await findSlackUserIdByEmail(accessToken, qaUser.email)
            }
          } else if (qaUser.slack?.accessToken) {
            // PM does not have Slack, but QA does: send from QA's token to QA's own Slack User ID
            accessToken = qaUser.slack.accessToken
            channelId = qaUser.slack.userId
          }

          if (accessToken && channelId) {
            const suiteLink = `http://localhost:3000/dashboard/${projectId}/test-cases` + 
              (suite.srsDocumentId ? `?srsId=${suite.srsDocumentId}` : '')

            const slackText = `*Test Suite Review Submitted*
PM *${reviewer.username}* has reviewed the test suite *${suite.suiteName}* in project *${project.projectName}*.
Status: *${statusLabel}*
Feedback: "${commentText}"

Please check the details here:
${suiteLink}`

            await sendMessageToChannel(accessToken, channelId, slackText)
            console.log(`Slack review notification successfully sent to QA ${qaUser.username} (${channelId})`)
          }
        }
      } catch (slackErr) {
        console.error('Failed to send Slack review response notification:', slackErr.message)
      }
    }

    return suite
  }
}

export const testSuiteService = new TestSuiteService()
