import jwt from 'jsonwebtoken'
import env from '../config/env.js'
import { userRepository } from '../repositories/user.repository.js'
import { ApiError } from '../utils/apiError.js'
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors/index.js'

export class AuthService {
  constructor(userRepo = userRepository) {
    this.userRepo = userRepo
  }

  generateToken(user) {
    return jwt.sign(
      { id: user._id, email: user.email, username: user.username, role: user.role },
      env.jwtSecret || 'supersecretjwtkeyforauth',
      { expiresIn: '7d' }
    )
  }

  async register({ username, email, password }) {
    const existingUser = await this.userRepo.findByEmail(email)
    if (existingUser) {
      throw new ApiError('An account with this email already exists.', 400)
    }

    const user = await this.userRepo.create({ username, email, password })
    const token = this.generateToken(user)

    return {
      token,
      user: { id: user._id, username: user.username, email: user.email },
    }
  }

  async login({ email, password }) {
    const user = await this.userRepo.findByEmail(email)
    if (!user) {
      throw new ApiError('Invalid email or password.', 401)
    }

    if (user.isActive === false) {
      throw new ForbiddenError('Your account has been disabled. Please contact the administrator.')
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      throw new ApiError('Invalid email or password.', 401)
    }

    const token = this.generateToken(user)

    return {
      token,
      user: { id: user._id, username: user.username, email: user.email },
    }
  }

  async getCurrentUser(userId) {
    const user = await this.userRepo.findById(userId, '-password')
    if (!user) {
      throw new NotFoundError('User not found.')
    }

    if (user.isActive === false) {
      throw new ForbiddenError('Your account has been disabled. Please contact the administrator.')
    }

    return {
      id: user._id,
      username: user.username,
      email: user.email,
    }
  }

  async handleGoogleNext({ email, username }) {
    let user = await this.userRepo.findByEmail(email)
    if (user && user.isActive === false) {
      throw new ForbiddenError('Your account has been disabled. Please contact the administrator.')
    }

    if (!user) {
      const isConfiguredAdmin = email.toLowerCase() === 'admin@memorres.com'
      const userCount = await this.userRepo.countDocuments()
      const role = isConfiguredAdmin || userCount === 0 ? 'admin' : 'pending'

      user = await this.userRepo.create({
        username: username || email.split('@')[0],
        email: email.toLowerCase(),
        role,
      })
    }

    const token = this.generateToken(user)

    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    }
  }

  async updateRole(userId, role) {
    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found.')
    }

    if (user.isActive === false) {
      throw new ForbiddenError('Your account has been disabled. Please contact the administrator.')
    }

    user.role = role
    await this.userRepo.save(user)

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    }
  }

  async getAllUsers(requestingUserRole) {
    if (requestingUserRole !== 'admin') {
      throw new ForbiddenError('Access denied. Admin privileges required.')
    }
    return this.userRepo.findAllUsers()
  }

  async updateUserRole(targetUserId, newRole, requestingUserRole) {
    if (requestingUserRole !== 'admin') {
      throw new ForbiddenError('Access denied. Admin privileges required.')
    }

    const user = await this.userRepo.findById(targetUserId)
    if (!user) {
      throw new NotFoundError('User not found.')
    }

    user.role = newRole
    await this.userRepo.save(user)

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    }
  }

  async updateProfile(userId, { username, role }) {
    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found.')
    }

    if (username && username.trim()) {
      user.username = username.trim()
    }

    if (role && ['project_manager', 'qa', 'developer'].includes(role)) {
      user.role = role
    }

    await this.userRepo.save(user)

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    }
  }

  async toggleUserStatus(targetUserId, isActive, requestingUser) {
    if (requestingUser.role !== 'admin') {
      throw new ForbiddenError('Access denied. Admin privileges required.')
    }

    const user = await this.userRepo.findById(targetUserId)
    if (!user) {
      throw new NotFoundError('User not found.')
    }

    if (user.email === 'admin@memorres.com' || user._id.toString() === requestingUser.id) {
      throw new ApiError('Admin cannot disable their own account.', 400)
    }

    user.isActive = isActive
    await this.userRepo.save(user)

    return {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }
  }
}

export const authService = new AuthService()
