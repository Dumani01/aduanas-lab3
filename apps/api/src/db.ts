import 'dotenv/config';
import pg from 'pg';
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000 });
export const reader = new pg.Pool({ connectionString: process.env.DATABASE_READER_URL, max: 3, connectionTimeoutMillis: 5000 });
