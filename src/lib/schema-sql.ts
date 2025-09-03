// src/lib/schema-sql.ts
export const SQL_STATEMENTS: string[] = [
  // UUIDs (Neon supports pgcrypto)
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,

  // Core users table
  `CREATE TABLE IF NOT EXISTS users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT UNIQUE NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`,

  // (you can add more tables here later, e.g. families, memberships, trees, etc.)
];
