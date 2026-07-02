import mongoose from 'mongoose'

const featureSchema = new mongoose.Schema({
  feature_name: { type: String, default: '' },
  description: { type: String, default: '' },
  actors: { type: [String], default: [] },
  functional_requirements: { type: [String], default: [] },
  business_rules: { type: [String], default: [] },
  validation_rules: { type: [String], default: [] },
  preconditions: { type: [String], default: [] },
  postconditions: { type: [String], default: [] },
  dependencies: { type: [String], default: [] },
  navigation_flow: { type: [String], default: [] },
  non_functional_requirements: { type: [String], default: [] },
  assumptions: { type: [String], default: [] },
  ambiguities: { type: [String], default: [] },
  clarifications_needed: { type: [String], default: [] }
}, { _id: false })

const moduleSchema = new mongoose.Schema({
  module_name: { type: String, default: '' },
  description: { type: String, default: '' },
  features: { type: [featureSchema], default: [] }
}, { _id: false })

const globalRoleSchema = new mongoose.Schema({
  role: { type: String, default: '' },
  permissions: { type: [String], default: [] }
}, { _id: false })

const analyzedDataSchema = new mongoose.Schema({
  document_name: { type: String, default: '' },
  project_name: { type: String, default: '' },
  summary: { type: String, default: '' },
  modules: { type: [moduleSchema], default: [] },
  global_roles: { type: [globalRoleSchema], default: [] },
  global_business_rules: { type: [String], default: [] },
  global_validations: { type: [String], default: [] },
  cross_module_dependencies: { type: [String], default: [] },
  document_level_ambiguities: { type: [String], default: [] },
  document_level_clarifications_needed: { type: [String], default: [] }
}, { _id: false })

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
  analyzedData: {
    type: analyzedDataSchema,
    default: null
  },
  status: {
    type: String,
    enum: ['uploaded', 'analyzing', 'completed', 'failed'],
    default: 'uploaded',
    index: true
  },
  errorMessage: {
    type: String,
    default: null
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
