import mongoose, { Schema, models } from 'mongoose';

const DriverAttendanceSchema = new Schema(
  {
    driverId:  { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
    companyId: { type: Schema.Types.ObjectId, required: true },

    date: { type: Date, required: true },

    // present  = normal working day
    // absent   = did not work (no pay)
    // holiday  = public/declared holiday but driver worked → 1.5× daily base
    status: {
      type: String,
      enum: ['present', 'absent', 'holiday'],
      required: true,
      default: 'present',
    },

    kmDriven:  { type: Number, default: 0, min: 0 },  // km for incentive calc
    notes:     { type: String, default: '' },
  },
  { timestamps: true }
);

// One record per driver per date
DriverAttendanceSchema.index({ driverId: 1, date: 1 }, { unique: true });

export default models.DriverAttendance ||
  mongoose.model('DriverAttendance', DriverAttendanceSchema);
