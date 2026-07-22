import mongoose, { Schema, model, models } from 'mongoose';

/**
 * A workshop visit — servicing, a repair, or a part replacement.
 *
 * The paper books never tracked this properly. The only trace is the duty
 * column occasionally reading "Service for 6362", which tells you the car was
 * off the road but not what was done or what it cost. Those days are imported
 * as `status: 'completed'` stubs with a zero cost so the history is not blank;
 * everything after this goes in through the app.
 *
 * Vehicle.maintenanceRecords stays for backwards compatibility with the
 * existing car page, but this collection is the one to query — costs per
 * vehicle, upcoming services, and downtime all need it standalone.
 */
const RepairSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'CompanyAdmin', required: true, index: true },

    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    vehiclePlate: { type: String, default: '' },
    /** Last 4 of the plate, matching how the books refer to a car. */
    vehicleCode: { type: String, default: '' },

    date: { type: Date, required: true },

    category: {
      type: String,
      enum: [
        'service',      // routine / scheduled servicing
        'repair',       // something broke
        'tyre',
        'battery',
        'bodywork',
        'electrical',
        'cng-kit',
        'insurance',
        'fitness',
        'permit',
        'pollution',
        'other',
      ],
      default: 'service',
      index: true,
    },

    description: { type: String, default: '' },

    /** Parts + labour, split so the workshop bill can be reconciled. */
    partsCost: { type: Number, default: 0, min: 0 },
    labourCost: { type: Number, default: 0, min: 0 },
    cost: { type: Number, default: 0, min: 0 },

    odometer: { type: Number, default: null },

    garage: { type: String, default: '' },
    invoiceNo: { type: String, default: '' },

    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },

    /** Days the vehicle could not earn. Drives the downtime report. */
    downtimeDays: { type: Number, default: 0, min: 0 },

    /** Next service due — by date, by odometer, or both. */
    nextDueDate: { type: Date, default: null },
    nextDueOdometer: { type: Number, default: null },

    /** Set when the workshop day was inferred from a driver's duty column. */
    reportedByDriverId: { type: Schema.Types.ObjectId, ref: 'Driver', default: null },

    notes: { type: String, default: '' },

    origin: { type: String, enum: ['sheet', 'app'], default: 'app', index: true },
    source: {
      workbook: String,
      sheet: String,
      row: Number,
    },
  },
  { timestamps: true, collection: 'repairs' },
);

RepairSchema.index({ companyId: 1, date: -1 });
RepairSchema.index({ companyId: 1, vehicleId: 1, date: -1 });
// Finds what is due without scanning the whole history.
RepairSchema.index({ companyId: 1, status: 1, nextDueDate: 1 });

/**
 * Imported service stubs are one-per-vehicle-per-day, which is what keeps a
 * re-import from stacking duplicates. App-entered repairs are exempt — a car
 * can genuinely visit two garages in a day.
 */
RepairSchema.index(
  { companyId: 1, vehicleId: 1, date: 1 },
  { unique: true, partialFilterExpression: { origin: 'sheet' } },
);

/** Total is always parts + labour unless a single figure was entered. */
RepairSchema.pre('validate', function () {
  const parts = Number(this.partsCost) || 0;
  const labour = Number(this.labourCost) || 0;
  if (parts || labour) this.cost = Math.round((parts + labour) * 100) / 100;
});

const Repair = models.Repair || model('Repair', RepairSchema);
export default Repair;
