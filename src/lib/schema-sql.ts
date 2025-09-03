// src/lib/schema-sql.ts
export const SQL_STATEMENTS: string[] = [
  // Enable UUID generation (either pgcrypto or uuid-ossp; errors are ignored in ensureSchema)
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  // Users table
  `CREATE TABLE IF NOT EXISTS users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT UNIQUE NOT NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
   )`
];
