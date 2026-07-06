import jwt from 'jsonwebtoken'
import User from './user.model.js'
import env from '../../config/env.js'

// Helper to generate token
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
      return res.status(400).json({
        success: false,
        error: 'Please provide username, email, and password.'
      })
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists.'
      })
    }

    // Create user (hashing is handled pre-save in User model)
    const user = new User({
      username,
      email,
      password
    })

    await user.save()

    const token = generateToken(user)

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password.'
      })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      })
    }

    const token = generateToken(user)

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-password')
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found.'
      })
    }

    return res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    })
  } catch (err) {
    next(err)
  }
}
