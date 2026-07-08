import mongoose from 'mongoose'

const requirementAnalysisSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  // Which SRS document this analysis belongs to
  srsDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  analyzedData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    default: null
  },
  agent0Score: {
    type: Number,
    default: null
  },
  agent0Feedback: {
    type: String,
    default: null
  },
  agent0Status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
})

requirementAnalysisSchema.index({ createdAt: -1 })
requirementAnalysisSchema.index({ projectId: 1, srsDocumentId: 1 })

export default mongoose.model('RequirementAnalysis', requirementAnalysisSchema)
