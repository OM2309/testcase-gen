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
