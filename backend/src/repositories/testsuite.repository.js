import TestSuite from '../modules/testsuite/testsuite.model.js'

export class TestSuiteRepository {
  async findByProjectId(projectId) {
    return TestSuite.find({ projectId }).lean()
  }

  async findOne(query) {
    return TestSuite.findOne(query)
  }

  async findOneAndUpdate(query, update, options = {}) {
    return TestSuite.findOneAndUpdate(query, update, options)
  }

  async save(testSuiteInstance) {
    return testSuiteInstance.save()
  }
}

export const testSuiteRepository = new TestSuiteRepository()
