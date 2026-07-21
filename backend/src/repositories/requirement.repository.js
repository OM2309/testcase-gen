import RequirementAnalysis from '../modules/requirement/requirement.model.js'

export class RequirementRepository {
  async findByProjectId(projectId) {
    return RequirementAnalysis.find({ projectId }).lean()
  }

  async findOne(query) {
    return RequirementAnalysis.findOne(query)
  }

  async findOneAndUpdate(query, update, options = {}) {
    return RequirementAnalysis.findOneAndUpdate(query, update, options)
  }

  async findByIdAndUpdate(id, update, options = {}) {
    return RequirementAnalysis.findByIdAndUpdate(id, update, options)
  }
}

export const requirementRepository = new RequirementRepository()
