import mongoose from 'mongoose'

const stepSchema = new mongoose.Schema({
  step_number: { type: Number, required: true },
  action: { type: String, required: true },
  target: { type: String, default: '' },
  value: { type: String, default: '' },
  description: { type: String, default: '' },
  expected: { type: String, default: '' }
}, { _id: false })

const testCaseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  module: { type: String, default: '' },
  feature: { type: String, default: '' },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  severity: { type: String, enum: ['Critical', 'Major', 'Minor'], default: 'Major' },
  type: { type: String, default: 'functional' },
  tags: { type: [String], default: [] },
  preconditions: { type: [String], default: [] },
  test_data: { type: mongoose.Schema.Types.Mixed, default: {} },
  steps: { type: [stepSchema], default: [] },
  expected_result: { type: String, default: '' },
  cleanup_steps: { type: [String], default: [] },
  source_requirements: { type: [String], default: [] }
}, { _id: false })

const testSuiteSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  suiteName: { type: String, default: 'Automated Test Suite' },
  projectName: { type: String, default: '' },
  testCases: { type: [testCaseSchema], default: [] }
}, {
  timestamps: true
})

testSuiteSchema.index({ createdAt: -1 })

export default mongoose.model('TestSuite', testSuiteSchema)
