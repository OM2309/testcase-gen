import User from '../auth/user.model.js'
import { ApiError } from '../../utils/apiError.js'

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

  if (!user.slack?.accessToken) {
    throw new ApiError('Slack is not connected. Please connect Slack first.', 400)
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${user.slack.accessToken}`,
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
