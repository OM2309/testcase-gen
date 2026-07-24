import User from '../auth/user.model.js'
import { ApiError } from '../../utils/apiError.js'
import env from '../../config/env.js'

const SLACK_API = 'https://slack.com/api'

/**
 * Send a message to a Slack channel on behalf of a user.
 * Looks up the user's stored Slack access token and calls chat.postMessage.
 *
 * @param {string} userId - The MongoDB user ID
 * @param {string} channel - Slack channel ID (e.g. "C01ABCDEF") or channel name (e.g. "#general")
 * @param {string} text - The message text to send
 * @returns {Promise<object>} The Slack API response
 */
export async function sendSlackMessage(userId, channel, text) {
  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError('User not found.', 404)
  }

  const token = user.slack?.accessToken || env.slackBotToken
  if (!token) {
    throw new ApiError('Slack is not connected. Please connect Slack or configure SLACK_BOT_TOKEN.', 400)
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ channel, text })
  })

  const data = await response.json()

  if (!data.ok) {
    console.error('Slack API error:', data.error)
    throw new ApiError(`Slack API error: ${data.error}`, 502)
  }

  return data
}

/**
 * Fetches all channels the bot has access to plus workspace users.
 * @param {string} [accessToken] - Optional token, defaults to user token or env.slackBotToken
 * @returns {{ channels: Array, users: Array }}
 */
export async function getChannelsAndUsers(accessToken) {
  const token = accessToken || env.slackBotToken
  if (!token) {
    throw new ApiError('Slack access token not provided and SLACK_BOT_TOKEN is not configured.', 400)
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }

  const [channelsRes, usersRes] = await Promise.all([
    fetch(`${SLACK_API}/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=200`, { headers }),
    fetch(`${SLACK_API}/users.list?limit=200`, { headers })
  ])

  let channelsData = await channelsRes.json()
  const usersData = await usersRes.json()

  if (!channelsData.ok && channelsData.error === 'missing_scope') {
    // Retry fetching only public channels if private channels scope (groups:read) is missing
    const fallbackRes = await fetch(`${SLACK_API}/conversations.list?types=public_channel&exclude_archived=true&limit=200`, { headers })
    channelsData = await fallbackRes.json()
  }

  if (!channelsData.ok) {
    throw new ApiError(`Slack channels error: ${channelsData.error}`, 400)
  }

  if (!usersData.ok) {
    throw new ApiError(`Slack users error: ${usersData.error}`, 400)
  }

  const channels = (channelsData.channels || []).map(ch => ({
    id: ch.id,
    name: ch.name,
    type: 'channel',
    isPrivate: ch.is_private || false,
    memberCount: ch.num_members || 0
  }))

  // Filter out bots, deleted users, and Slackbot
  const users = (usersData.members || [])
    .filter(u => !u.is_bot && !u.deleted && u.id !== 'USLACKBOT')
    .map(u => ({
      id: u.id,
      name: u.real_name || u.name,
      displayName: u.profile?.display_name || u.name,
      type: 'user',
      avatar: u.profile?.image_48 || null
    }))

  return { channels, users }
}

/**
 * Sends a text message to a Slack channel or DM using an access token.
 * @param {string} accessToken - The user's Slack OAuth bot token
 * @param {string} channelId - The channel or user ID to send to
 * @param {string} text - The message text (supports Slack mrkdwn)
 * @returns {object} Slack API response
 */
export async function sendMessageToChannel(accessToken, channelId, text) {
  const token = accessToken || env.slackBotToken
  if (!token) {
    throw new ApiError('Slack access token not provided and SLACK_BOT_TOKEN is not configured.', 400)
  }

  const response = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: channelId,
      text,
      mrkdwn: true
    })
  })

  const data = await response.json()

  if (!data.ok) {
    throw new ApiError(`Slack send error (${channelId}): ${data.error}`, 400)
  }

  return data
}

/**
 * Resolves a user's Slack User ID by their email.
 * Tries direct lookup first, falls back to listing workspace users.
 * 
 * @param {string} accessToken - Slack OAuth bot token
 * @param {string} email - Email of the user to find
 * @returns {Promise<string|null>} Slack User ID or null
 */
export async function findSlackUserIdByEmail(accessToken, email) {
  if (!email) return null
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  }

  // 1. Try users.lookupByEmail API
  try {
    const response = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
      headers
    })
    const data = await response.json()
    if (data.ok && data.user) {
      return data.user.id
    }
  } catch (err) {
    console.error('Error in users.lookupByEmail:', err)
  }

  // 2. Fallback to users.list API
  try {
    const response = await fetch('https://slack.com/api/users.list?limit=200', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    const data = await response.json()
    if (data.ok && data.members) {
      const match = data.members.find(
        (m) => m.profile?.email && m.profile.email.toLowerCase() === email.toLowerCase()
      )
      if (match) return match.id
    }
  } catch (err) {
    console.error('Error in users.list fallback:', err)
  }

  return null
}
