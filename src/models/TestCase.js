import mongoose from 'mongoose'

const testCaseSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  testCaseId: {
    type: String,
    required: true
  },
  moduleId: {
    type: String,
    required: true,
    index: true
  },
  requirementId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Positive', 'Negative', 'Edge Case', 'Business Logic', 'Role Based', 'Missing Requirement'],
    required: true
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  userRole: {
    type: String,
    default: 'User'
  },
  preconditions: {
    type: [String],
    default: []
  },
  steps: {
    type: [String],
    default: []
  },
  inputData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expectedResult: {
    type: String,
    required: true
  },
  edgeCaseNote: {
    type: String,
    default: null
  },
  actualResult: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'skipped'],
    default: 'pending'
  }
}, {
  timestamps: true
})

testCaseSchema.index({ projectId: 1, moduleId: 1 })
testCaseSchema.index({ projectId: 1, type: 1 })

export default mongoose.model('TestCase', testCaseSchema)
