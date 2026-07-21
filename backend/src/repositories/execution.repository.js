import ExecutionRun from '../modules/execution/execution.model.js'

export class ExecutionRepository {
  async findById(runId) {
    return ExecutionRun.findById(runId)
  }

  async findByProjectId(projectId) {
    return ExecutionRun.find({ projectId }).sort({ createdAt: -1 }).lean()
  }

  async create(data) {
    const run = new ExecutionRun(data)
    return run.save()
  }

  async save(runInstance) {
    return runInstance.save()
  }
}

export const executionRepository = new ExecutionRepository()
