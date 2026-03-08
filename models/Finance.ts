import mongoose, { Schema, models } from 'mongoose';

const FinanceSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true },

    date: { type: Date, required: true, default: Date.now },

    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },

    category: {
      type: String,
      required: true,
      // Income: 'Trip Revenue', 'Other Income'
      // Expense: 'Fuel', 'Salary', 'Servicing', 'Maintenance', 'Insurance', 'Toll', 'Other'
    },

    description: { type: String, required: true },

    amount: { type: Number, required: true },

    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'card', 'bank', 'other'],
      default: 'cash',
    },

    referenceId: { type: String }, // optional trip ID or external reference

    notes: String,
  },
  { timestamps: true }
);

export default models.Finance || mongoose.model('Finance', FinanceSchema);
