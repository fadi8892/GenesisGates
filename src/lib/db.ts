// src/lib/db.ts
import { sql as vercelSql } from '@vercel/postgres';
import { SQL_STATEMENTS } from './schema-sql';

// Re-export the Vercel Postgres sql tagged template
export const sql = vercelSql;

// Run simple, idempotent schema init once per runtime
let _initialized = false;

export async function ensureSchema() {
  if (_initialized) return;
  for (const stmt of SQL_STATEMENTS) {
    try {
      await sql`${stmt as any}`;
    } catch {
      // ignore individual statement failures to stay idempotent
    }
  }
  _initialized = true;
}
