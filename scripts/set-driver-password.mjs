/**
 * Issues driver-app credentials.
 *
 * Drivers cannot self-register — a driver row implies an employment
 * relationship and a verified licence — so staff set the password here.
 *
 *   MONGODB_URI="mongodb+srv://..." node scripts/set-driver-password.mjs <phone> <password>
 *
 * If no driver exists with that phone the script stops and lists the phones it
 * does know, rather than creating a half-populated driver row that would fail
 * the console's own validation later.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;

const [phoneArg, passwordArg] = process.argv.slice(2);

if (!MONGODB_URI) {
  console.error('✗ Set MONGODB_URI in the environment first.');
  process.exit(1);
}
if (!phoneArg || !passwordArg) {
  console.error('Usage: node scripts/set-driver-password.mjs <phone> <password>');
  process.exit(1);
}
if (passwordArg.length < 6) {
  console.error('✗ Password must be at least 6 characters.');
  process.exit(1);
}

const phone = phoneArg.replace(/\s+/g, '');

// Loose schema on purpose — this script only touches passwordHash and must not
// impose validation on driver rows the console created.
const Driver = mongoose.model(
  'Driver',
  new mongoose.Schema({}, { strict: false, collection: 'drivers' }),
);

async function main() {
  await mongoose.connect(MONGODB_URI);

  const driver = await Driver.findOne({ phone });

  if (!driver) {
    console.error(`✗ No driver found with phone ${phone}.`);
    const others = await Driver.find().select('name phone').limit(20).lean();
    if (others.length) {
      console.error('\nDrivers currently on file:');
      for (const d of others) console.error(`   ${d.phone ?? '(no phone)'}  ${d.name ?? ''}`);
    } else {
      console.error('\nThere are no drivers yet. Add one in the console under Dashboard → Driver.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }

  driver.set('passwordHash', await bcrypt.hash(passwordArg, 10));
  await driver.save();

  console.log(`✓ App credentials set for ${driver.get('name') ?? phone} (${phone}).`);
  console.log('  They can now sign in to CSC Driver with this phone and password.');

  if (!driver.get('vehicle') && !driver.get('vehicleId')) {
    console.warn('\n⚠ No vehicle is assigned to this driver.');
    console.warn('  They will be able to sign in and accept rides, but offline rides');
    console.warn('  are blocked until a vehicle is assigned in the console.');
  }

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('✗ Failed:', e.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
