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

/**
 * Must match lib/mongodb.ts, which passes MONGODB_DB as `dbName`.
 *
 * Without this the script connected on the URI alone. Because the connection
 * string carries no path component, every password it wrote landed in a
 * database called `test` while the app read from the one named here — so the
 * credentials appeared to be issued successfully and the driver was still
 * refused at sign-in, with nothing in either place to explain why.
 */
const MONGODB_DB = process.env.MONGODB_DB;

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
  await mongoose.connect(MONGODB_URI, { ...(MONGODB_DB ? { dbName: MONGODB_DB } : {}) });

  // Say which database this landed in. The failure this script had was silent
  // precisely because it never did.
  console.log(`· database: ${mongoose.connection.name}`);
  if (!MONGODB_DB && mongoose.connection.name === 'test') {
    console.warn(
      '⚠ MONGODB_DB is not set and the URI names no database, so this is the\n' +
      '  default `test` database. If the app reads a different one, the password\n' +
      '  set here will not let the driver sign in. Set MONGODB_DB to match.\n',
    );
  }

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
