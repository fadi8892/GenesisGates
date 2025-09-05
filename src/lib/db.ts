// Very simple in-memory store (persists per server instance).
// Swap later with Postgres or Vercel KV without changing the front end.
export type Role = "owner" | "admin" | "editor" | "viewer";
export type Person = {
  id: string;
  name: string;
  sex?: "M" | "F";
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  lat?: number;
  lon?: number;
  spouseIds?: string[];
  parentIds?: string[];
  childIds?: string[];
  notes?: string;
};

export type Tree = {
  id: string;
  name: string;
  members: Record<string, Role>; // email -> role
  people: Record<string, Person>;
  createdAt: number;
};

export type User = { email: string; name?: string };

const store = {
  users: new Map<string, User>(),
  trees: new Map<string, Tree>(),
  sessions: new Map<string, string>(), // sessionId -> email
  otps: new Map<string, string>() // email -> 6-digit
};

// Starter data for demo
(function seed() {
  const email = "demo@genesis.local";
  store.users.set(email, { email, name: "Demo User" });
  const t: Tree = {
    id: "t1",
    name: "Demo Family",
    createdAt: Date.now(),
    members: { [email]: "owner" },
    people: {}
  };
  const a: Person = { id: "p1", name: "John Demo", sex: "M", birthPlace: "Baghdad, Iraq", birthDate: "1955-02-01" };
  const b: Person = { id: "p2", name: "Mary Demo", sex: "F", birthPlace: "San Diego, USA", birthDate: "1958-07-12" };
  const c: Person = { id: "p3", name: "Fadi Demo", sex: "M", birthPlace: "Erbil, Iraq", birthDate: "1989-09-02" };

  a.childIds = ["p3"]; b.childIds = ["p3"];
  c.parentIds = ["p1", "p2"];
  a.spouseIds = ["p2"]; b.spouseIds = ["p1"];

  t.people[a.id] = a; t.people[b.id] = b; t.people[c.id] = c;
  store.trees.set(t.id, t);
})();

export function getStore() { return store; }
export function genId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-4)}`;
}
