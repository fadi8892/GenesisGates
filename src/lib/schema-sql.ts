export const SQL_STATEMENTS: string[] = [
  `create extension if not exists pgcrypto`,
  `create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    created_at timestamptz default now()
  )`,
  `create table if not exists trees (
    id text primary key,
    name text,
    created_by uuid references users(id),
    created_at timestamptz default now()
  )`,
  `create table if not exists tree_members (
    tree_id text references trees(id) on delete cascade,
    user_id uuid references users(id) on delete cascade,
    role text not null check (role in ('admin','editor','viewer')),
    primary key (tree_id, user_id)
  )`,
  `create table if not exists storage_records (
    id uuid primary key default gen_random_uuid(),
    tree_id text references trees(id) on delete cascade,
    cid text not null,
    provider text not null,
    bytes bigint not null,
    mode text not null,
    cost_cents integer default 0,
    stripe_payment_id text,
    created_at timestamptz default now()
  )`
];
