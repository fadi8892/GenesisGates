// src/lib/db.ts
import { sql as vercelSql } from '@vercel/postgres';
import { SQL_STATEMENTS } from './schema-sql';

export const sql = vercelSql;

let _initPromise: Promise<void> | null = null;
export async function ensureSchema() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    for (const stmt of SQL_STATEMENTS) {
      try {
        await sql.query(stmt);
      } catch {
        // ignore single-statement failures to stay idempotent
      }
    }
  })();
  return _initPromise;
}
