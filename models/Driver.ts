import { IDriver } from '@/types/types';
import mongoose, { Schema, model, models } from 'mongoose';
import { geoPoint } from './geo';


const driverSchema = new Schema<IDriver>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    company: { type: String, default: '' },
    email: { type: String, required: true },
    status: { type: String, enum: ['available','on-trip','offline'], default: 'offline' },
    vehicle: { type: String, default: null },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    license: { type: String, required: true },
    joinDate: { type: Date, default: Date.now },

    // ---- Daily book ----
    // The registers spell the same person several ways ("Ashish"/"Aashish").
    // Every spelling seen in the books is kept here so an import maps to one
    // person instead of creating a second driver row.
    aliases: { type: [String], default: [], index: true },

    /**
     * Cash the driver is currently holding on the company's behalf — the "Rest
     * Amount" carried forward each day. Negative means the company owes them,
     * which happens when a day's fuel exceeds what was collected.
     *
     * Maintained by the settlement writes; never edit it directly or it will
     * drift from the settlement history.
     */
    currentBalance: { type: Number, default: 0 },
    balanceUpdatedAt: { type: Date, default: null },

    /** Usual shift. Individual duties can still differ. */
    defaultShift: { type: String, enum: ['day', 'night', null], default: null },

    /** Scans and photos, stored in R2 — see lib/r2.ts. */
    photoUrl: { type: String, default: '' },
    licenseDocUrl: { type: String, default: '' },
    idProofUrl: { type: String, default: '' },
    policeVerificationUrl: { type: String, default: '' },

    /** False for drivers who have left; keeps their history queryable. */
    active: { type: Boolean, default: true, index: true },
    exitDate: { type: Date, default: null },
    exitReason: { type: String, default: '' },
    exitNotes: { type: String, default: '' },
    /** The float they were carrying when they left — what was written off or collected. */
    balanceAtExit: { type: Number, default: null },
    rating: { type: Number, default: 0 },
    trips: { type: Number, default: 0 },
    address: { type: String, default: '' },
    bloodGroup: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    baseSalary: { type: Number, default: 0 },       // monthly base salary (₹)
    perKmRate: { type: Number, default: 0 },         // incentive per km driven (₹)

    // ---- Driver mobile app ----
    // Set when staff issues app credentials (scripts/setDriverPassword.ts).
    // Staff-created driver rows without one simply cannot sign in to the app.
    passwordHash: { type: String, required: false, select: false },

    // Live position, refreshed by the app while the driver is on duty.
    // GeoJSON order is [longitude, latitude] — NOT [lat, lng].
    location: geoPoint(),
    locationUpdatedAt: { type: Date, default: null },

    // Duty state as reported by the app. Distinct from `status`, which staff
    // edit from the console — this one is owned by the driver.
    onDuty: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'drivers' // 🔥 CHANGE THIS to EXACT collection name
  }
);

// Powers the "nearest driver first" query in lib/dispatch.ts.
driverSchema.index({ location: '2dsphere' });
driverSchema.index({ onDuty: 1, status: 1 });

const Driver = models.Driver || model<IDriver>('Driver', driverSchema);
export default Driver;
