import mongoose, { Schema, models } from 'mongoose'

const UserSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },

    fullName: String,
    email: { type: String, required: true, unique: true },
    phone: String,

    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ['ADMIN', 'STAFF'],
      required: true,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

export default models.User || mongoose.model('User', UserSchema)
