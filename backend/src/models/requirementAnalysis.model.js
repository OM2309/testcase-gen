import mongoose from 'mongoose'

const requirementAnalysisSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
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
  }
}, {
  timestamps: true
})

requirementAnalysisSchema.index({ createdAt: -1 })

export default mongoose.model('RequirementAnalysis', requirementAnalysisSchema)
