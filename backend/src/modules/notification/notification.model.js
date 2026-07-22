import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  testSuiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TestSuite',
    required: true
  },
  type: {
    type: String,
    enum: ['approval_request', 'comment', 'approval_response'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
})

// Composite index for fast retrieval of unread notifications
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 })

export default mongoose.model('Notification', notificationSchema)
