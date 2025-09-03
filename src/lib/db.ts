import { sql } from '@vercel/postgres';
import { SQL_STATEMENTS } from './schema-sql';

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  for (const stmt of SQL_STATEMENTS) {
    try {
      await sql.query(stmt);
    } catch {
      // ignore "already exists" etc.
    }
  }
  initialized = true;
}

export { sql };
