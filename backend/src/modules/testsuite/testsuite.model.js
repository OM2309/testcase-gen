import mongoose from 'mongoose'

const stepSchema = new mongoose.Schema({
  step_number: { type: Number, required: true },
  action: { type: String, required: true },
  target: { type: String, default: '' },
  value: { type: String, default: '' },
  description: { type: String, default: '' },
  expected: { type: String, default: '' },
  expected_url: { type: String, default: '' },
  expected_text: { type: String, default: '' }
}, { _id: false })

const testCaseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  module: { type: String, default: '' },
  feature: { type: String, default: '' },
  priority: { type: String, default: 'High' },
  severity: { type: String, default: 'Critical' },
  type: { type: String, default: 'functional' },
  isRegressive: { type: Boolean, default: false },
  scenario_type: { type: String, default: 'positive' },
  tags: { type: [String], default: [] },
  preconditions: { type: [String], default: [] },
  test_data: { type: mongoose.Schema.Types.Mixed, default: {} },
  steps: { type: [stepSchema], default: [] },
  expected_result: { type: String, default: '' },
  cleanup_steps: { type: [String], default: [] },
  source_requirements: { type: [mongoose.Schema.Types.Mixed], default: [] }
}, { _id: false })

const testSuiteSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  // Which SRS document this test suite belongs to
  srsDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  suiteName: { type: String, default: 'Automated Test Suite' },
  projectName: { type: String, default: '' },
  generatedFromRequirementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RequirementAnalysis',
    required: true
  },
  testCases: { type: [testCaseSchema], default: [] },
  rejectionFeedback: [{
    testCaseId: { type: String, required: true },
    feedback: { type: String, default: '' },
    resolvedByAction: {
      type: String,
      enum: ['pending', 'rejected_change', 'ai_updated', 'manually_updated'],
      default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
  }],
  approvalStatus: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected'],
    default: 'draft',
    index: true
  },
  approvalRequestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalRequestedAt: {
    type: Date,
    default: null
  },
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    role: { type: String },
    commentText: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
})

testSuiteSchema.index({ createdAt: -1 })
testSuiteSchema.index({ projectId: 1, srsDocumentId: 1 })

export default mongoose.model('TestSuite', testSuiteSchema)
