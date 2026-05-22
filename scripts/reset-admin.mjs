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

const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
const CompanyAdmin =
  mongoose.models.CompanyAdmin || mongoose.model('CompanyAdmin', schema);

await mongoose.connect(process.env.MONGODB_URI);

const passwordHash = await bcrypt.hash(PASSWORD, 10);
const res = await CompanyAdmin.updateOne(
  { $or: [{ adminEmail: EMAIL }, { officialEmail: EMAIL }] },
  { $set: { passwordHash, role: 'ADMIN' } }
);

console.log('Updated:', res.modifiedCount, 'matched:', res.matchedCount);
console.log('Login:', EMAIL, '/', PASSWORD);

await mongoose.disconnect();
