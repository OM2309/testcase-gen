import mongoose from 'mongoose'

const srsDocumentSchema = new mongoose.Schema({
  originalFileName: { type: String, required: true },
  filePath: { type: String, required: true },
  parsedText: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: true })

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
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
  // Legacy single-file fields kept for backward compatibility
  documentName: {
    type: String,
    trim: true,
    default: ''
  },
  originalFileName: {
    type: String,
    default: ''
  },
  filePath: {
    type: String,
    default: ''
  },
  parsedText: {
    type: String,
    default: ''
  },
  // New: multiple SRS documents array
  srsDocuments: {
    type: [srsDocumentSchema],
    default: []
  },
  jiraHost: {
    type: String,
    default: ''
  },
  jiraEmail: {
    type: String,
    default: ''
  },
  jiraToken: {
    type: String,
    default: ''
  },
  jiraProjectKey: {
    type: String,
    default: ''
  },
  jiraConnected: {
    type: Boolean,
    default: false
  },
  linearApiKey: {
    type: String,
    default: ''
  },
  linearTeamId: {
    type: String,
    default: ''
  },
  linearConnected: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['created', 'uploaded', 'analyzing', 'analyzed', 'tests_generated', 'failed'],
    default: 'created',
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
