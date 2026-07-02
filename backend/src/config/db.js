import mongoose from 'mongoose'

const MONGO_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS: 10000
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.')
  }

  mongoose.set('strictQuery', false)

  mongoose.connection.on('connected', () => {
    console.log(`[DB] Connected to MongoDB`)
  })

  mongoose.connection.on('error', (err) => {
    console.error(`[DB] Connection error:`, err.message)
  })

  mongoose.connection.on('disconnected', () => {
    console.log(`[DB] Disconnected from MongoDB`)
  })

  await mongoose.connect(uri, MONGO_OPTIONS)

  return mongoose.connection
}

export async function disconnectDB() {
  await mongoose.disconnect()
}
