import User from '../auth/user.model.js'
import env from '../../config/env.js'
import { sendSuccess } from '../../utils/responseHelper.js'
import { ApiError } from '../../utils/apiError.js'
import { getChannelsAndUsers, sendMessageToChannel } from './slack.service.js'

/**
 * GET /api/slack/connect
 * Redirects the authenticated user to Slack's OAuth consent page.
 * The user's app JWT ID is passed via the `state` param so we can
 * associate the callback with the correct user.
 */
export async function slackConnect(req, res) {
  const scopes = 'chat:write,channels:read,groups:read,im:read,mpim:read,users:read,users:read.email'
  const state = req.user.id // pass our user ID so we can link in callback
  // console.log("env.slackClientId", env.slackClientId);
  // console.log("env.slackRedirectUri", env.slackRedirectUri);

  const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize')
  slackAuthUrl.searchParams.set('client_id', env.slackClientId)
  slackAuthUrl.searchParams.set('scope', scopes)
  slackAuthUrl.searchParams.set('redirect_uri', env.slackRedirectUri)
  slackAuthUrl.searchParams.set('state', state)

  return sendSuccess(res, 'Slack OAuth URL generated.', {
    url: slackAuthUrl.toString()
  })
}

/**
 * GET /auth/slack/callback
 * Handles the OAuth callback from Slack.
 * Exchanges the authorization code for an access token,
 * then stores it on the user document.
 */
export async function slackCallback(req, res) {
  try {
    const { code, state, error: slackError } = req.query

    if (slackError) {
      console.error('Slack OAuth error:', slackError)
      return res.redirect('http://localhost:3000/dashboard/profile?slack=error&reason=' + encodeURIComponent(slackError))
    }

    if (!code || !state) {
      return res.redirect('http://localhost:3000/dashboard/profile?slack=error&reason=missing_code_or_state')
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: env.slackClientId,
        client_secret: env.slackClientSecret,
        code,
        redirect_uri: env.slackRedirectUri
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.ok) {
      console.error('Slack token exchange failed:', tokenData.error)
      return res.redirect('http://localhost:3000/dashboard/profile?slack=error&reason=' + encodeURIComponent(tokenData.error))
    }

    // Update the user document with Slack credentials
    const userId = state // our app user ID passed through state
    const user = await User.findById(userId)

    if (!user) {
      return res.redirect('http://localhost:3000/dashboard/profile?slack=error&reason=user_not_found')
    }

    user.slack = {
      accessToken: tokenData.access_token,
      teamId: tokenData.team?.id || null,
      teamName: tokenData.team?.name || null,
      userId: tokenData.authed_user?.id || null,
      connectedAt: new Date()
    }

    await user.save()

    return res.redirect('http://localhost:3000/dashboard/profile?slack=success')
  } catch (err) {
    console.error('Error in slackCallback:', err)
    return res.redirect('http://localhost:3000/dashboard/profile?slack=error&reason=internal_error')
  }
}

/**
 * GET /api/slack/status
 * Returns the Slack connection status for the authenticated user.
 */
export async function slackStatus(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      throw new ApiError('User not found.', 404)
    }

    const connected = !!(user.slack?.accessToken)

    return sendSuccess(res, 'Slack status fetched.', {
      connected,
      teamName: user.slack?.teamName || null,
      teamId: user.slack?.teamId || null,
      connectedAt: user.slack?.connectedAt || null
    })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/slack/disconnect
 * Removes the stored Slack tokens from the user document.
 */
export async function slackDisconnect(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      throw new ApiError('User not found.', 404)
    }

    user.slack = {
      accessToken: null,
      teamId: null,
      teamName: null,
      userId: null,
      connectedAt: null
    }

    await user.save()

    return sendSuccess(res, 'Slack disconnected successfully.')
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/slack/channels
 * Returns public channels and workspace users for the connected Slack workspace.
 */
export async function slackChannels(req, res, next) {
  try {
    const user = await User.findById(req.user.id)
    if (!user) {
      throw new ApiError('User not found.', 404)
    }

    if (!user.slack?.accessToken) {
      throw new ApiError('Slack account is not connected.', 400)
    }

    const data = await getChannelsAndUsers(user.slack.accessToken)
    return sendSuccess(res, 'Slack channels and users fetched.', data)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/slack/send
 * Sends a message to one or more channels/users.
 */
export async function slackSendMessage(req, res, next) {
  try {
    const { channelIds, text } = req.body
    if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
      throw new ApiError('channelIds must be a non-empty array.', 400)
    }
    if (!text) {
      throw new ApiError('Message text is required.', 400)
    }

    const user = await User.findById(req.user.id)
    if (!user) {
      throw new ApiError('User not found.', 404)
    }

    if (!user.slack?.accessToken) {
      throw new ApiError('Slack account is not connected.', 400)
    }

    const results = []
    for (const channelId of channelIds) {
      try {
        const resData = await sendMessageToChannel(user.slack.accessToken, channelId, text)
        results.push({ channelId, success: true, ts: resData.ts })
      } catch (err) {
        results.push({ channelId, success: false, error: err.message })
      }
    }

    return sendSuccess(res, 'Slack messages processed.', { results })
  } catch (err) {
    next(err)
  }
}
