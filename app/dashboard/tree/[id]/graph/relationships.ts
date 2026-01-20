type EdgeLike = {
  type?: string | null;
  kind?: string | null;
  data?: { kind?: string | null } | null;
};

const PARTNERSHIP_KINDS = new Set(["partner", "spouse", "marriage"]);

export function getEdgeKind(edge: EdgeLike): string {
  return String(edge?.kind ?? edge?.type ?? edge?.data?.kind ?? "").toLowerCase();
}

export function isPartnershipEdge(edge: EdgeLike): boolean {
  const kind = getEdgeKind(edge);
  if (!kind) return false;
  return PARTNERSHIP_KINDS.has(kind);
}

export function isParentChildEdge(edge: EdgeLike): boolean {
  return !isPartnershipEdge(edge);
}
