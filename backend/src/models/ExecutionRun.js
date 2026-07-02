import mongoose from 'mongoose'

const stepResultSchema = new mongoose.Schema({
  step_number: { type: Number, required: true },
  action: { type: String, required: true },
  status: { type: String, enum: ['passed', 'failed', 'skipped'], default: 'skipped' },
  duration_ms: { type: Number, default: 0 },
  message: { type: String, default: '' },
  screenshot: { type: String, default: '' },
  error: { type: mongoose.Schema.Types.Mixed, default: null },
  recovery: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false })

const testResultSchema = new mongoose.Schema({
  test_case_id: { type: String, required: true },
  title: { type: String, required: true },
  status: { type: String, enum: ['passed', 'failed', 'skipped'], default: 'skipped' },
  duration_ms: { type: Number, default: 0 },
  steps: { type: [stepResultSchema], default: [] },
  artifacts: {
    screenshots: { type: [String], default: [] },
    video: { type: String, default: '' },
    trace: { type: String, default: '' }
  }
}, { _id: false })

const executionRunSchema = new mongoose.Schema({
  suiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSuite',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  summary: {
    total: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 }
  },
  results: { type: [testResultSchema], default: [] }
}, {
  timestamps: true
})

executionRunSchema.index({ createdAt: -1 })

export default mongoose.model('ExecutionRun', executionRunSchema)
