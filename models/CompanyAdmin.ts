import mongoose, { Schema, models } from 'mongoose'

const CompanyAdminSchema = new Schema(
  {
    companyName: { type: String, required: true },
    companyId:{type: mongoose.Schema.Types.ObjectId,},
    businessType: String,
    gstNumber: String,
    panNumber: String,

    address: String,
    city: String,
    state: String,
    pincode: String,

    officialEmail: { type: String, required: true, unique: true },
    officialPhone: String,

    adminFullName: { type: String, required: true },
    adminEmail: { type: String, required: true, unique: true },
    adminPhone: String,

    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ['ADMIN', 'STAFF'],
      default: 'ADMIN',
    },
  },
  { timestamps: true }
)

export default models.CompanyAdmin ||
  mongoose.model('CompanyAdmin', CompanyAdminSchema)
