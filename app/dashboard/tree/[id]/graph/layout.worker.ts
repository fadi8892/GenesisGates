/**
 * GENESIS GATES: FAMILY ATLAS LAYOUT WORKER
 * Layered + Radial layouts with partner grouping and generation-aware ordering.
 */

const CONFIG = {
  NODE_WIDTH: 260,
  NODE_HEIGHT: 160,
  PARTNER_GAP: 24,
  SIBLING_GAP: 48,
  GROUP_GAP: 140,
  GENERATION_GAP: 220,
  RADIAL_RADIUS_STEP: 320,
} as const;

type RenderLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type?: "bezier" | "step" | "line";
};

type LayoutNode = {
  id: string;
  x: number;
  y: number;
  generation: number;
};

type GraphMaps = {
  nodeIds: Set<string>;
  parentEdges: any[];
  partnerEdges: any[];
  parentMap: Record<string, string[]>;
  childMap: Record<string, string[]>;
  partnerMap: Record<string, string[]>;
};

function isParentChildEdge(edge: any) {
  const kind = (edge?.kind ?? edge?.type ?? "").toString().toLowerCase();
  if (!kind) return true;
  return !["partner", "spouse", "marriage"].includes(kind);
}

function buildMaps(nodes: any[], edges: any[]): GraphMaps {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const parentEdges = edges.filter(
    (e) => isParentChildEdge(e) && nodeIds.has(e.source) && nodeIds.has(e.target)
  );
  const partnerEdges = edges.filter(
    (e) => !isParentChildEdge(e) && nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  const parentMap: Record<string, string[]> = {};
  const childMap: Record<string, string[]> = {};
  const partnerMap: Record<string, string[]> = {};

  for (const id of nodeIds) {
    parentMap[id] = [];
    childMap[id] = [];
    partnerMap[id] = [];
  }

  for (const e of parentEdges) {
    parentMap[e.target].push(e.source);
    childMap[e.source].push(e.target);
  }

  for (const e of partnerEdges) {
    partnerMap[e.source].push(e.target);
    partnerMap[e.target].push(e.source);
  }

  for (const id of nodeIds) {
    parentMap[id] = Array.from(new Set(parentMap[id])).sort();
    childMap[id] = Array.from(new Set(childMap[id])).sort();
    partnerMap[id] = Array.from(new Set(partnerMap[id])).sort();
  }

  return { nodeIds, parentEdges, partnerEdges, parentMap, childMap, partnerMap };
}

function computeGenerations(
  nodeIds: Set<string>,
  parentMap: Record<string, string[]>,
  childMap: Record<string, string[]>
) {
  const generations: Record<string, number> = {};
  const inDegree: Record<string, number> = {};

  for (const id of nodeIds) {
    inDegree[id] = parentMap[id]?.length ?? 0;
  }

  const queue: string[] = [];
  for (const id of nodeIds) {
    if (inDegree[id] === 0) queue.push(id);
  }

  while (queue.length) {
    const id = queue.shift()!;
    const current = generations[id] ?? 0;
    const children = childMap[id] ?? [];

    for (const childId of children) {
      generations[childId] = Math.max(generations[childId] ?? 0, current + 1);
      inDegree[childId] = Math.max(0, inDegree[childId] - 1);
      if (inDegree[childId] === 0) queue.push(childId);
    }
  }

  for (const id of nodeIds) {
    if (generations[id] == null) generations[id] = 0;
  }

  return generations;
}

class DisjointSet {
  private parent: Record<string, string> = {};

  constructor(items: string[]) {
    items.forEach((item) => {
      this.parent[item] = item;
    });
  }

  find(x: string): string {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

function buildPartnerGroups(nodes: any[], partnerEdges: any[]) {
  const dsu = new DisjointSet(nodes.map((n) => n.id));
  for (const edge of partnerEdges) {
    dsu.union(edge.source, edge.target);
  }

  const groups: Record<string, string[]> = {};
  for (const node of nodes) {
    const root = dsu.find(node.id);
    if (!groups[root]) groups[root] = [];
    groups[root].push(node.id);
  }

  for (const key of Object.keys(groups)) {
    groups[key] = groups[key].sort();
  }

  return groups;
}

function computeLayeredPositions(nodes: any[], edges: any[]) {
  const { nodeIds, parentEdges, parentMap, childMap, partnerEdges } = buildMaps(nodes, edges);
  const generations = computeGenerations(nodeIds, parentMap, childMap);
  const partnerGroups = buildPartnerGroups(nodes, partnerEdges);
  const partnerGroupByNode: Record<string, string> = {};
  for (const [groupId, members] of Object.entries(partnerGroups)) {
    for (const member of members) {
      partnerGroupByNode[member] = groupId;
    }
  }

  const nodesByGeneration = new Map<number, string[]>();
  for (const node of nodes) {
    const gen = generations[node.id] ?? 0;
    if (!nodesByGeneration.has(gen)) nodesByGeneration.set(gen, []);
    nodesByGeneration.get(gen)!.push(node.id);
  }

  const generationKeys = Array.from(nodesByGeneration.keys()).sort((a, b) => a - b);
  const orderIndex: Record<string, number> = {};
  const positions: Record<string, LayoutNode> = {};

  for (const gen of generationKeys) {
    const nodesInGen = nodesByGeneration.get(gen) ?? [];
    const groupBuckets: Record<string, string[]> = {};

    for (const nodeId of nodesInGen) {
      const groupKey = partnerGroupByNode[nodeId] ?? nodeId;
      if (!groupBuckets[groupKey]) groupBuckets[groupKey] = [];
      groupBuckets[groupKey].push(nodeId);
    }

    const groups = Object.entries(groupBuckets).map(([key, members]) => {
      const sortedMembers = Array.from(new Set(members)).sort();
      const parentOrders = sortedMembers.flatMap((id) =>
        (parentMap[id] || []).map((p) => orderIndex[p]).filter((v) => v != null)
      );
      const score =
        parentOrders.length > 0
          ? parentOrders.reduce((a, b) => a + b, 0) / parentOrders.length
          : Number.POSITIVE_INFINITY;

      return { key, members: sortedMembers, score };
    });

    groups.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.key.localeCompare(b.key);
    });

    let cursorX = 0;
    let order = 0;
    for (const group of groups) {
      const groupWidth =
        group.members.length * CONFIG.NODE_WIDTH +
        Math.max(0, group.members.length - 1) * CONFIG.PARTNER_GAP;
      let memberX = cursorX;

      for (const member of group.members) {
        positions[member] = {
          id: member,
          x: memberX,
          y: gen * CONFIG.GENERATION_GAP,
          generation: gen,
        };
        orderIndex[member] = order;
        order += 1;
        memberX += CONFIG.NODE_WIDTH + CONFIG.PARTNER_GAP;
      }

      cursorX += groupWidth + CONFIG.GROUP_GAP;
    }
  }

  return { positions, generations, parentEdges, partnerEdges };
}

function buildOrthogonalGeometry(
  positions: Record<string, LayoutNode>,
  parentEdges: any[],
  partnerEdges: any[]
) {
  const geometry: RenderLine[] = [];

  for (const edge of partnerEdges) {
    const left = positions[edge.source];
    const right = positions[edge.target];
    if (!left || !right) continue;

    const [a, b] = left.x <= right.x ? [left, right] : [right, left];
    geometry.push({
      id: `partner-${edge.source}-${edge.target}`,
      x1: a.x + CONFIG.NODE_WIDTH,
      y1: a.y + CONFIG.NODE_HEIGHT / 2,
      x2: b.x,
      y2: b.y + CONFIG.NODE_HEIGHT / 2,
      type: "line",
    });
  }

  for (const edge of parentEdges) {
    const parent = positions[edge.source];
    const child = positions[edge.target];
    if (!parent || !child) continue;

    geometry.push({
      id: `link-${edge.source}-${edge.target}`,
      x1: parent.x + CONFIG.NODE_WIDTH / 2,
      y1: parent.y + CONFIG.NODE_HEIGHT,
      x2: child.x + CONFIG.NODE_WIDTH / 2,
      y2: child.y,
      type: "step",
    });
  }

  return geometry;
}

function buildRadialPositions(
  positions: Record<string, LayoutNode>,
  generations: Record<string, number>,
  isFan: boolean
) {
  const values = Object.values(positions);
  if (values.length === 0) return positions;

  const xs = values.map((v) => v.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const span = isFan ? Math.PI : Math.PI * 2;
  const start = isFan ? -Math.PI * 0.75 : -Math.PI / 2;

  const radial: Record<string, LayoutNode> = {};
  for (const node of values) {
    const t = (node.x - minX) / (maxX - minX || 1);
    const angle = start + t * span;
    const radius = (generations[node.id] ?? 0) * CONFIG.RADIAL_RADIUS_STEP;
    const cx = Math.cos(angle) * radius;
    const cy = Math.sin(angle) * radius;

    radial[node.id] = {
      id: node.id,
      x: cx - CONFIG.NODE_WIDTH / 2,
      y: cy - CONFIG.NODE_HEIGHT / 2,
      generation: node.generation,
    };
  }

  return radial;
}

function buildRadialGeometry(
  positions: Record<string, LayoutNode>,
  parentEdges: any[],
  partnerEdges: any[]
) {
  const geometry: RenderLine[] = [];

  for (const edge of partnerEdges) {
    const a = positions[edge.source];
    const b = positions[edge.target];
    if (!a || !b) continue;

    geometry.push({
      id: `partner-${edge.source}-${edge.target}`,
      x1: a.x + CONFIG.NODE_WIDTH / 2,
      y1: a.y + CONFIG.NODE_HEIGHT / 2,
      x2: b.x + CONFIG.NODE_WIDTH / 2,
      y2: b.y + CONFIG.NODE_HEIGHT / 2,
      type: "line",
    });
  }

  for (const edge of parentEdges) {
    const parent = positions[edge.source];
    const child = positions[edge.target];
    if (!parent || !child) continue;

    geometry.push({
      id: `link-${edge.source}-${edge.target}`,
      x1: parent.x + CONFIG.NODE_WIDTH / 2,
      y1: parent.y + CONFIG.NODE_HEIGHT / 2,
      x2: child.x + CONFIG.NODE_WIDTH / 2,
      y2: child.y + CONFIG.NODE_HEIGHT / 2,
      type: "bezier",
    });
  }

  return geometry;
}

function buildLayout(nodes: any[], edges: any[], mode: string) {
  const { positions, generations, parentEdges, partnerEdges } = computeLayeredPositions(nodes, edges);

  if (mode === "circular" || mode === "fan") {
    const radial = buildRadialPositions(positions, generations, mode === "fan");
    const geometry = buildRadialGeometry(radial, parentEdges, partnerEdges);
    return { positions: radial, geometry };
  }

  const geometry = buildOrthogonalGeometry(positions, parentEdges, partnerEdges);
  return { positions, geometry };
}

function toOutputNodes(nodes: any[], positions: Record<string, LayoutNode>) {
  return nodes.map((node: any) => {
    const layout = positions[node.id];
    return {
      ...node,
      position: {
        x: layout?.x ?? 0,
        y: layout?.y ?? 0,
      },
      data: { ...(node.data || {}), generation: layout?.generation ?? 0 },
    };
  });
}

function rotateHorizontal(nodes: any[], geometry: RenderLine[]) {
  const rotatedNodes = nodes.map((node: any) => ({
    ...node,
    position: { x: node.position.y, y: node.position.x },
  }));

  const rotatedGeometry = geometry.map((line) => {
    const { x1, y1, x2, y2 } = line;
    return { ...line, x1: y1, y1: x1, x2: y2, y2: x2 };
  });

  return { rotatedNodes, rotatedGeometry };
}

self.onmessage = (e: MessageEvent) => {
  const { nodes, edges, mode } = e.data as {
    nodes: any[];
    edges: any[];
    mode?: string;
  };

  if (!nodes?.length) {
    self.postMessage({ nodes: [], geometry: [] });
    return;
  }

  const layoutMode = mode ?? "vertical";
  const { positions, geometry } = buildLayout(nodes, edges || [], layoutMode);
  let finalNodes = toOutputNodes(nodes, positions);
  let finalGeometry = geometry;

  if (layoutMode === "horizontal") {
    const rotated = rotateHorizontal(finalNodes, finalGeometry);
    finalNodes = rotated.rotatedNodes;
    finalGeometry = rotated.rotatedGeometry;
  }

  self.postMessage({ nodes: finalNodes, geometry: finalGeometry });
};
