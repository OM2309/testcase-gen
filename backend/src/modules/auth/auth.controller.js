import jwt from 'jsonwebtoken'
import User from './user.model.js'
import env from '../../config/env.js'
import { sendSuccess, sendError } from '../../utils/responseHelper.js'
import { ApiError } from '../../utils/apiError.js'

function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, username: user.username },
    env.jwtSecret || 'supersecretjwtkeyforauth',
    { expiresIn: '7d' }
  )
}

export async function register(req, res, next) {
  try {
    const { username, email, password } = req.body

    if (!username || !email || !password) {
      throw new ApiError('Please provide username, email, and password.', 400)
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      throw new ApiError('An account with this email already exists.', 400)
    }

    const user = new User({ username, email, password })
    await user.save()

    const token = generateToken(user)

    return sendSuccess(res, 'Account created successfully.', {
      token,
      user: { id: user._id, username: user.username, email: user.email }
    }, 201)
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      throw new ApiError('Please provide email and password.', 400)
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      throw new ApiError('Invalid email or password.', 401)
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      throw new ApiError('Invalid email or password.', 401)
    }

    const token = generateToken(user)

    return sendSuccess(res, 'Login successful.', {
      token,
      user: { id: user._id, username: user.username, email: user.email }
    })
  } catch (err) {
    next(err)
  }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) {
      throw new ApiError('User not found.', 404)
    }

    return sendSuccess(res, 'User fetched successfully.', {
      id: user._id,
      username: user.username,
      email: user.email
    })
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
      'https://www.googleapis.com/auth/userinfo.email'
    ].join(' ')
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

    // Exchange authorization code for access token
    const tokenUrl = 'https://oauth2.googleapis.com/token'
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: env.googleCallbackUrl,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      console.error('Failed to exchange code for token:', errText)
      return res.redirect(`http://localhost:3000/login?error=Failed+to+authenticate+with+Google`)
    }

    const { access_token } = await tokenResponse.json()

    // Fetch user profile from Google using the access token
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    })

    if (!profileResponse.ok) {
      console.error('Failed to fetch Google user info')
      return res.redirect(`http://localhost:3000/login?error=Failed+to+fetch+user+profile`)
    }

    const profile = await profileResponse.json()
    if (!profile.email) {
      return res.redirect('http://localhost:3000/login?error=Google+account+has+no+email')
    }

    // Check if user already exists
    let user = await User.findOne({ email: profile.email.toLowerCase() })
    if (!user) {
      const username = profile.name || profile.email.split('@')[0]
      user = new User({
        username,
        email: profile.email.toLowerCase()
      })
      await user.save()
    }

    // Generate JWT token for the user
    const token = generateToken(user)

    // Redirect user back to the frontend with the JWT token
    return res.redirect(`http://localhost:3000/login?token=${token}`)
  } catch (err) {
    console.error('Error in googleCallback:', err)
    return res.redirect('http://localhost:3000/login?error=Internal+Server+Error+during+Google+Sign-In')
  }
}
