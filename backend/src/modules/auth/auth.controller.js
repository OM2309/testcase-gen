import env from '../../config/env.js'
import { authService } from '../../services/auth.service.js'
import { sendSuccess } from '../../utils/responseHelper.js'

export async function register(req, res, next) {
  try {
    const result = await authService.register(req.body)
    return sendSuccess(res, 'Account created successfully.', result, 201)
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body)
    return sendSuccess(res, 'Login successful.', result)
  } catch (err) {
    next(err)
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id)
    return sendSuccess(res, 'User fetched successfully.', user)
  } catch (err) {
    next(err)
  }
}

export function googleLogin(req, res) {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
  const options = {
    redirect_uri: env.googleCallbackUrl,
    client_id: env.googleClientId,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  }
  const qs = new URLSearchParams(options)
  return res.redirect(`${rootUrl}?${qs.toString()}`)
}

export async function googleCallback(req, res, next) {
  try {
    const { code } = req.query
    if (!code) {
      return res.redirect('http://localhost:3000/login?error=No+code+provided+from+Google')
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token'
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: env.googleCallbackUrl,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      return res.redirect('http://localhost:3000/login?error=Failed+to+authenticate+with+Google')
    }

    const { access_token } = await tokenResponse.json()
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!profileResponse.ok) {
      return res.redirect('http://localhost:3000/login?error=Failed+to+fetch+user+profile')
    }

    const profile = await profileResponse.json()
    if (!profile.email) {
      return res.redirect('http://localhost:3000/login?error=Google+account+has+no+email')
    }

    const result = await authService.handleGoogleNext({
      email: profile.email,
      username: profile.name || profile.email.split('@')[0],
    })

    return res.redirect(`http://localhost:3000/login?token=${result.token}`)
  } catch (err) {
    return res.redirect('http://localhost:3000/login?error=Internal+Server+Error+during+Google+Sign-In')
  }
}

export async function googleNext(req, res, next) {
  try {
    const result = await authService.handleGoogleNext(req.body)
    return sendSuccess(res, 'Google authenticated successfully.', result)
  } catch (err) {
    next(err)
  }
}

export async function updateRole(req, res, next) {
  try {
    const user = await authService.updateRole(req.user.id, req.body.role)
    return sendSuccess(res, 'Profession selected successfully.', user)
  } catch (err) {
    next(err)
  }
}

export async function getUsers(req, res, next) {
  try {
    const users = await authService.getAllUsers(req.user.role)
    return sendSuccess(res, 'Users fetched successfully.', users)
  } catch (err) {
    next(err)
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const user = await authService.updateUserRole(req.params.id, req.body.role, req.user.role)
    return sendSuccess(res, 'User role updated successfully.', user)
  } catch (err) {
    next(err)
  }
}

export async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateProfile(req.user.id, req.body)
    return sendSuccess(res, 'Profile updated successfully.', user)
  } catch (err) {
    next(err)
  }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const user = await authService.toggleUserStatus(req.params.id, req.body.isActive, req.user)
    return sendSuccess(res, 'User status updated successfully.', user)
  } catch (err) {
    next(err)
  }
}
