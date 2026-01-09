import mysql from 'mysql2/promise';
import mariadb from 'mariadb';

export const db = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT), // 👈 REQUIRED
  connectionLimit: 5,
});


export const pool = mariadb.createPool({
  host: process.env.DB_HOST,        // 127.0.0.1
  user: process.env.DB_USER,        // root
  password: process.env.DB_PASSWORD,// India@1947
  database: process.env.DB_NAME,    // csc_billing
  port: Number(process.env.DB_PORT) || 3306, // 3006
  connectionLimit: 5,
});