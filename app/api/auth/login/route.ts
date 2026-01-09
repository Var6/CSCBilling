// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  connectionLimit: 5,
});

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const conn = await pool.getConnection();
    try {
      const rows = await conn.query(
        `SELECT admin_email, password_hash, admin_full_name 
         FROM company_admins 
         WHERE admin_email = ? LIMIT 1`,
        [email]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }

      const user = rows[0];

      // FOR TESTING: plaintext password check
      if (password !== user.password_hash) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      // Login successful
      return NextResponse.json({ message: 'Login successful', user: { email: user.admin_email, name: user.admin_full_name } });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
