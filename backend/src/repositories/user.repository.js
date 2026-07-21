import User from '../modules/auth/user.model.js'

export class UserRepository {
  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() })
  }

  async findById(id, selectFields = null) {
    let query = User.findById(id)
    if (selectFields) query = query.select(selectFields)
    return query
  }

  async countDocuments(filter = {}) {
    return User.countDocuments(filter)
  }

  async create(userData) {
    const user = new User(userData)
    return user.save()
  }

  async findAllUsers(selectFields = '-password') {
    return User.find({}).select(selectFields).sort({ createdAt: -1 })
  }

  async save(userInstance) {
    return userInstance.save()
  }
}

export const userRepository = new UserRepository()
