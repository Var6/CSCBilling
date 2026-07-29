import mongoose from 'mongoose';

/**
 * Shared MongoDB connection.
 *
 * Next.js reloads modules on every request in development and reuses the
 * process across invocations in production, so the connection is cached on
 * `globalThis` — without that, each hot reload opens another pool and the
 * cluster runs out of connections.
 */

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Which database inside the cluster to use.
 *
 * A URI with no path component silently lands everything in a database called
 * `test`, which is easy to miss until two environments end up sharing one. Set
 * MONGODB_DB (or put the name in the URI path) to be explicit.
 */
const MONGODB_DB = process.env.MONGODB_DB;

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as { _mongoose?: Cached };
const cached: Cached = globalForMongoose._mongoose ?? { conn: null, promise: null };
globalForMongoose._mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  /*
   * Fail loudly. This used to warn and return null, which meant every route
   * carried on and called Mongoose with no connection — surfacing as a
   * buffering timeout thirty seconds later, far from the actual cause. A
   * missing connection string is a deployment error and should read like one.
   */
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Add it to .env.local locally, and to the project ' +
      'environment variables on your host.',
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        ...(MONGODB_DB ? { dbName: MONGODB_DB } : {}),
        // Surface an unreachable cluster in seconds rather than after the
        // default 30s buffering timeout.
        serverSelectionTimeoutMS: 10_000,
        socketTimeoutMS: 45_000,
        maxPoolSize: 10,
        retryWrites: true,
      })
      .catch((err) => {
        // Clear the cached promise so the next request retries, instead of
        // every later request awaiting a promise that already rejected.
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
