import mongoose, { Schema, model, models } from 'mongoose';

/**
 * A single fuel or CNG fill — the "CSC TRAVELS FUEL DETAILS" book.
 *
 * The odometer reading taken at the pump is the useful part: consecutive
 * readings on the same vehicle give real mileage (km per kg/litre), which is
 * how fuel theft and a failing engine both show up first.
 */
const FuelLogSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'CompanyAdmin', required: true, index: true },

    date: { type: Date, required: true },

    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
    driverName: { type: String, required: true },

    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    /** Last 4 digits of the plate — how the fuel book identifies a car. */
    vehicleCode: { type: String, default: '', index: true },
    vehiclePlate: { type: String, default: '' },

    fuelType: { type: String, enum: ['cng', 'petrol', 'diesel', 'other'], default: 'cng' },

    /** Rupees paid at the pump. */
    amount: { type: Number, default: 0, min: 0 },
    /** Kg for CNG, litres for petrol/diesel. */
    quantity: { type: Number, default: 0, min: 0 },
    /** Derived at write time; handy for spotting a sudden price change. */
    ratePerUnit: { type: Number, default: 0 },

    /** Odometer at the pump. Null when the book left it blank. */
    meterReading: { type: Number, default: null },
    /** Non-numeric meter cell preserved verbatim, e.g. "Trip A-9614". */
    meterNote: { type: String, default: '' },

    /** Present on the per-driver sheets, which log duty start/end odometer. */
    dutyType: {
      type: String,
      enum: ['day', 'night', 'leave', 'off', 'service', 'unknown', null],
      default: null,
    },
    startKm: { type: Number, default: null },
    endKm: { type: Number, default: null },

    /**
     * Distance covered since this vehicle's previous fill, and the mileage that
     * implies. Computed by the importer and by the fuel API on write, since it
     * needs the preceding reading for the same vehicle.
     */
    kmSinceLast: { type: Number, default: null },
    mileage: { type: Number, default: null },

    notes: { type: String, default: '' },

    origin: { type: String, enum: ['sheet', 'app'], default: 'app', index: true },
    source: {
      workbook: String,
      sheet: String,
      layout: String,
      row: Number,
      col: Number,
    },
  },
  { timestamps: true, collection: 'fuellogs' },
);

/**
 * A driver can legitimately fill twice in one day, so the date+driver pair is
 * not unique on its own. The sheet cell a row came from is, which is what keeps
 * re-imports idempotent; rows entered in the app get a null source and are
 * exempt via the partial filter.
 */
FuelLogSchema.index(
  { 'source.sheet': 1, 'source.row': 1, 'source.col': 1 },
  { unique: true, partialFilterExpression: { origin: 'sheet' } },
);
FuelLogSchema.index({ companyId: 1, date: -1 });
FuelLogSchema.index({ companyId: 1, vehicleId: 1, date: -1 });
FuelLogSchema.index({ companyId: 1, driverId: 1, date: -1 });

FuelLogSchema.pre('validate', function () {
  const amount = Number(this.amount) || 0;
  const qty = Number(this.quantity) || 0;
  this.ratePerUnit = qty > 0 ? Math.round((amount / qty) * 100) / 100 : 0;
});

const FuelLog = models.FuelLog || model('FuelLog', FuelLogSchema);
export default FuelLog;
