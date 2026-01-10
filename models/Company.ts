const CompanySchema = new Schema({
  companyName: String,
  gstNumber: String,
  panNumber: String,
  address: String,
})
import mongoose, { Schema, models } from 'mongoose'