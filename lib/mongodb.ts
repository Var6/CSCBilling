import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

console.log('🔥 DEBUG MONGODB_URI:', MONGODB_URI ? 'configured' : 'missing')

let cached = (global as any).mongoose

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is missing; skipping DB connection for this request')
    return null
  }

  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI)
  }

  try {
    cached.conn = await cached.promise
    return cached.conn
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error)
    cached.promise = null
    return null
  }
}
