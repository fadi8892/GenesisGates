// src/lib/db.ts
import { sql as vercelSql } from '@vercel/postgres';
import { SQL_STATEMENTS } from './schema-sql';

// Re-export for app code
export const sql = vercelSql;

// Run schema once per serverless runtime
let _initPromise: Promise<void> | null = null;

export async function ensureSchema() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    for (const stmt of SQL_STATEMENTS) {
      try {
        // Use query() to execute dynamic DDL strings
        await sql.query(stmt);
      } catch {
        // ignore individual failures to keep init idempotent across providers
      }
    }
  })();
  return _initPromise;
}
