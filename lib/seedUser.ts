import { pool } from './db';
import bcrypt from 'bcryptjs';

export async function createTestUser() {
  const email = 'Rishabh@gmail.com';
  const password = 'India@1947';

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
  `INSERT INTO company_admins (admin_email, password_hash, admin_full_name)
   VALUES (?, ?, ?)
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);`,
  [email, hash, 'Rishabh Ranjan']
);
  console.log('✅ Test user created/updated!');
}
