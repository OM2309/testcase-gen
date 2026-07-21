import Project from '../modules/project/project.model.js'

export class ProjectRepository {
  async findById(id) {
    return Project.findById(id)
  }

  async findByIdWithPopulate(id, populateFields = ['userId', 'assignedUsers']) {
    return Project.findById(id).populate(populateFields)
  }

  async findAccessibleProjects(user) {
    if (user.role === 'admin') {
      return Project.find({}).populate('userId assignedUsers').sort({ createdAt: -1 })
    }
    return Project.find({
      $or: [
        { userId: user.id },
        { assignedUsers: user.id },
      ],
    }).populate('userId assignedUsers').sort({ createdAt: -1 })
  }

  async create(projectData) {
    const project = new Project(projectData)
    return project.save()
  }

  async save(projectInstance) {
    return projectInstance.save()
  }

  async findByIdAndDelete(id) {
    return Project.findByIdAndDelete(id)
  }
}

export const projectRepository = new ProjectRepository()
