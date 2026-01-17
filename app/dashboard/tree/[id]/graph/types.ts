// app/dashboard/tree/[id]/graph/types.ts
export type NodeId = string;

export type DbNode = {
  id: string;            // text
  tree_id: string;       // uuid (string in TS)
  type: string | null;   // text
  position_x: number | null; // numeric
  position_y: number | null; // numeric
  data: any;             // jsonb
  member_id: string | null; // uuid
  created_at?: string;
  updated_at?: string;
};

export type DbEdge = Record<string, any>; // we’ll normalize without assuming columns yet

// Normalized node used by UI/layout
export type PersonNode = {
  id: NodeId;
  tree_id: string;
  type?: string | null;

  // derived from data jsonb
  displayName: string;
  sex?: "M" | "F" | null;

  // keep raw data in case you need it
  data: any;

  // optional saved positions (manual mode later)
  position_x?: number | null;
  position_y?: number | null;
};

export type Edge = {
  id: string;
  tree_id: string;

  // parent -> child
  source: NodeId;
  target: NodeId;

  type?: string | null;
};

export type GraphData = {
  nodes: PersonNode[];
  edges: Edge[];
};

export type LayoutNode = {
  id: NodeId;
  x: number;
  y: number;
  depth: number;
};

export type LayoutResult = {
  byId: Record<NodeId, LayoutNode>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};
