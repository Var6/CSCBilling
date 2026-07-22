import { Schema } from 'mongoose';

/**
 * A GeoJSON Point sub-schema.
 *
 * Declared once and shared, because getting it wrong breaks writes in a way
 * that is hard to trace back. Writing the shape inline as
 *
 *   location: { type: { type: String, default: 'Point' }, coordinates: [Number] }
 *
 * makes Mongoose materialise `{ type: 'Point' }` with no coordinates on every
 * document, even ones that never had a position. A 2dsphere index then rejects
 * the whole save with "Can't extract geo keys … Point must be an array or
 * object" — so an unrelated field update fails on any document that has never
 * been given coordinates.
 *
 * Using a sub-schema with `default: undefined` on the parent path means the
 * subdocument simply does not exist until coordinates are actually set, which
 * a 2dsphere index is happy to skip.
 *
 * Coordinate order is [longitude, latitude] — the opposite of how everyone says
 * it out loud. Get this backwards and Patna lands in the Indian Ocean.
 */
export const PointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          Array.isArray(v) &&
          v.length === 2 &&
          Math.abs(v[0]) <= 180 &&
          Math.abs(v[1]) <= 90,
        message: 'coordinates must be [longitude, latitude] within valid ranges',
      },
    },
  },
  { _id: false },
);

/** Spread into a schema path: `location: geoPoint()`. */
export const geoPoint = () => ({ type: PointSchema, default: undefined });
