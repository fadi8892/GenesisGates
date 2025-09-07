export const SQL_STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,

  // users (already used by auth)
  `CREATE TABLE IF NOT EXISTS users (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       email TEXT UNIQUE NOT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,

  // trees
  `CREATE TABLE IF NOT EXISTS trees (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       tree_key TEXT UNIQUE NOT NULL,         -- short public Tree ID
       name TEXT NOT NULL,
       created_by UUID REFERENCES users(id) ON DELETE SET NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,

  // tree_members (who can edit which tree)
  `CREATE TABLE IF NOT EXISTS tree_members (
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
     role TEXT NOT NULL CHECK (role IN ('admin','editor','viewer')),
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (user_id, tree_id)
     )`,

  // persons (minimal person records for the tree)
  `CREATE TABLE IF NOT EXISTS persons (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       tree_id UUID NOT NULL REFERENCES trees(id) ON DELETE CASCADE,
       name TEXT NOT NULL,
       birth_date DATE NULL,
       death_date DATE NULL,
       lat DOUBLE PRECISION NULL,
       lon DOUBLE PRECISION NULL,
       created_by TEXT NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`
];