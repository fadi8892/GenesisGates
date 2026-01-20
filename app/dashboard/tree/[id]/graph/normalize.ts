import type { DbEdge, DbNode, Edge, PersonNode } from "./types";

function pickString(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickSex(obj: any): "M" | "F" | null {
  const v = obj?.sex ?? obj?.gender ?? obj?.Sex ?? obj?.Gender;
  if (typeof v !== "string") return null;
  const s = v.toLowerCase();
  if (s === "m" || s === "male") return "M";
  if (s === "f" || s === "female") return "F";
  return null;
}

export function normalizeNode(n: DbNode): PersonNode {
  const d = n.data ?? {};

  // 1. Try common name patterns
  const first = pickString(d, ["first_name", "firstName", "fname", "first"]);
  const last = pickString(d, ["last_name", "lastName", "lname", "last"]);
  const full =
    pickString(d, ["full_name", "fullName", "display_name", "displayName", "name", "title", "label"]) ??
    [first, last].filter(Boolean).join(" ").trim();

  const displayName = full && full.length ? full : `Person ${String(n.id).slice(0, 6)}`;

  // 2. Robust Date Parsing (Extract Year from strings like "10 Jan 1850")
  const extractYear = (val: any): number | null => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const match = val.match(/\d{4}/);
      return match ? parseInt(match[0], 10) : null;
    }
    return null;
  };

  const born_year = extractYear(d.born_year ?? d.bornYear ?? d.birthDate ?? d.birth ?? d.BIRT);
  const died_year = extractYear(d.died_year ?? d.diedYear ?? d.deathDate ?? d.death ?? d.DEAT);

  // 3. Construct enriched data object
  const cleanData = {
    ...d,
    label: displayName, // Ensure label is always set for UI
    born_year,
    died_year,
  };

  return {
    id: n.id,
    tree_id: n.tree_id,
    type: n.type,
    displayName,
    sex: pickSex(d),
    data: cleanData, // Pass enriched data to the UI
    position_x: n.position_x ?? null,
    position_y: n.position_y ?? null,
  };
}

export function normalizeEdge(e: DbEdge, treeId: string): Edge | null {
  // Support many possible column names from different importers:
  const source =
    e.source ??
    e.parent ??
    e.parent_id ??
    e.parentId ??
    e.from ??
    e.from_id ??
    e.fromId ??
    e.src ??
    e.src_id ??
    e.srcId;

  const target =
    e.target ??
    e.child ??
    e.child_id ??
    e.childId ??
    e.to ??
    e.to_id ??
    e.toId ??
    e.dst ??
    e.dst_id ??
    e.dstId;

  if (!source || !target) return null;

  const kind =
    e.kind ??
    e.relationship ??
    e.rel_type ??
    e.relation ??
    e.edge_type ??
    null;

  return {
    id: String(e.id ?? `${source}->${target}`),
    tree_id: String(e.tree_id ?? treeId),
    source: String(source),
    target: String(target),
    type: e.type ?? kind ?? null,
    kind: kind ?? null,
    data: e.data ?? null,
  };
}
