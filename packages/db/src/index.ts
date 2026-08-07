import mongoose from 'mongoose'
import { ValidationError } from '@chefmate/errors'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BaseDocument {
  _id: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

// ─── Connection ───────────────────────────────────────────────────────────────

/**
 * Connects to MongoDB and registers graceful-shutdown handlers for SIGINT/SIGTERM.
 * Throws if the initial connection fails.
 */
export async function connectMongo(
  uri: string,
  options?: mongoose.ConnectOptions,
): Promise<void> {
  // Register connection event listeners before connecting so they're in place
  // from the very first connection attempt.
  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected')
  })

  mongoose.connection.on('error', (err: Error) => {
    console.error('[db] MongoDB connection error:', err.message)
  })

  mongoose.connection.on('disconnected', () => {
    console.log('[db] MongoDB disconnected')
  })

  // Graceful shutdown: disconnect before the process exits.
  const shutdown = async (signal: string) => {
    console.log(`[db] Received ${signal} — closing MongoDB connection`)
    await disconnectMongo()
    process.exit(0)
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    ...options,
  })
}

/**
 * Disconnects from MongoDB. Used in tests for clean teardown.
 */
export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect()
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Converts a string to a Mongoose ObjectId.
 * Throws ValidationError if the string is not a valid ObjectId.
 */
export function toObjectId(id: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ID format: ${id}`)
  }
  return new mongoose.Types.ObjectId(id)
}
