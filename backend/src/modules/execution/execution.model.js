import mongoose from 'mongoose'

const stepResultSchema = new mongoose.Schema({
  stepNumber: { type: Number, required: true },
  action: { type: String, default: '' },
  target: { type: String, default: '' },
  value: { type: String, default: '' },
  expectedUrl: { type: String, default: '' },
  expectedText: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'running', 'passed', 'failed'], default: 'pending' },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  durationMs: { type: Number, default: 0 },
  errorMessage: { type: String, default: '' }
}, { _id: false })

const testCaseResultSchema = new mongoose.Schema({
  testCaseId: { type: String, required: true },
  title: { type: String, default: '' },
  module: { type: String, default: '' },
  feature: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'running', 'passed', 'failed', 'skipped'], default: 'pending' },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  durationMs: { type: Number, default: 0 },
  failedStepNumber: { type: Number, default: null },
  errorMessage: { type: String, default: '' },
  screenshotPath: { type: String, default: '' },
  stepResults: { type: [stepResultSchema], default: [] }
}, { _id: false })

const executionLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, enum: ['info', 'success', 'error'], default: 'info' },
  type: { type: String, default: '' },
  message: { type: String, default: '' },
  testCaseId: { type: String, default: '' },
  stepNumber: { type: Number, default: null }
}, { _id: false })

const testRunSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  testSuiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSuite',
    required: true
  },
  suiteName: { type: String, default: '' },
  projectName: { type: String, default: '' },
  status: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed'],
    default: 'queued'
  },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  totalTests: { type: Number, default: 0 },
  passedTests: { type: Number, default: 0 },
  failedTests: { type: Number, default: 0 },
  skippedTests: { type: Number, default: 0 },
  runConfig: {
    baseUrl: { type: String, default: '' },
    headless: { type: Boolean, default: true }
  },
  // Current progress tracking (for polling)
  currentTestCaseId: { type: String, default: '' },
  currentTestCaseTitle: { type: String, default: '' },
  currentStepNumber: { type: Number, default: 0 },
  currentStepAction: { type: String, default: '' },
  // Results
  testCaseResults: { type: [testCaseResultSchema], default: [] },
  executionLogs: { type: [executionLogSchema], default: [] }
}, {
  timestamps: true
})

testRunSchema.index({ createdAt: -1 })

export default mongoose.model('TestRun', testRunSchema)
