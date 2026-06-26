import mongoose from 'mongoose'

const projectSchema = new mongoose.Schema({
  projectName: {
    type: String,
    trim: true,
    default: 'Untitled Project'
  },
  projectDescription: {
    type: String,
    trim: true,
    default: ''
  },
  originalFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  analyzedData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  status: {
    type: String,
    enum: ['uploaded', 'analyzing', 'generating_tests', 'generating_code', 'completed', 'failed'],
    default: 'uploaded',
    index: true
  },
  folderName: {
    type: String,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  totalTestCases: {
    type: Number,
    default: 0
  },
  totalModules: {
    type: Number,
    default: 0
  },
  processingStartedAt: {
    type: Date,
    default: null
  },
  processingCompletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

projectSchema.index({ createdAt: -1 })

export default mongoose.model('Project', projectSchema)
