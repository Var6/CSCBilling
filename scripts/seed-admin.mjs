import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of env.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const EMAIL = 'admin@csctravels.com';
const PASSWORD = 'India@1947';

const schema = new mongoose.Schema(
  {
    companyName: String,
    businessType: String,
    officialEmail: { type: String, unique: true },
    officialPhone: String,
    adminFullName: String,
    adminEmail: { type: String, unique: true },
    adminPhone: String,
    passwordHash: String,
    role: { type: String, default: 'ADMIN' },
  },
  { timestamps: true }
);

const CompanyAdmin =
  mongoose.models.CompanyAdmin || mongoose.model('CompanyAdmin', schema);

await mongoose.connect(process.env.MONGODB_URI);

const existing = await CompanyAdmin.findOne({
  $or: [{ adminEmail: EMAIL }, { officialEmail: EMAIL }],
});

if (existing) {
  console.log('Admin already exists:', EMAIL);
} else {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  await CompanyAdmin.create({
    companyName: 'csctravels',
    businessType: 'Travel',
    officialEmail: EMAIL,
    officialPhone: '0000000000',
    adminFullName: 'CSC Admin',
    adminEmail: EMAIL,
    adminPhone: '0000000000',
    passwordHash,
    role: 'ADMIN',
  });
  console.log('Created admin:', EMAIL, '/', PASSWORD);
}

await mongoose.disconnect();
