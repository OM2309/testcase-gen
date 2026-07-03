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
  documentName: {
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
  parsedText: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['uploaded', 'analyzing', 'analyzed', 'tests_generated', 'failed'],
    default: 'uploaded',
    index: true
  },
  errorMessage: {
    type: String,
    default: null
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
