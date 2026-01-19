/**
 * GENESIS GATES: MULTI-MODE LAYOUT WORKER (Feature-Preserving + Tidy/Radial Add-on)
 */

const CONFIG = {
  NODE_WIDTH: 260,
  NODE_HEIGHT: 160,

  SPOUSE_GAP: 20,
  SIBLING_GAP: 40,
  COUSIN_GAP: 100,
  GENERATION_GAP: 200,

  STEM_LENGTH: 40,

  // Tidy/Radial tuning
  TIDY_X_GAP: 350,
  TIDY_Y_GAP: 180,
  RADIAL_RADIUS_STEP: 320,
} as const;

type RenderLine = {
  id: string;
  x1: number; y1: number; x2: number; y2: number;
  type: "partnership" | "stem" | "branch" | "direct";
  nodeIds?: string[];
};

type NodeLayout = {
  id: string;
  width: number;
  x: number;
  y: number;
  spouses: string[];
  generation: number;
};

type Family = { parents: string[]; children: string[] };

function isParentChildEdge(ed: any) {
  const kind = (ed?.kind ?? ed?.type ?? "").toString().toLowerCase();
  if (!kind) return true;
  if (kind === "partner" || kind === "spouse" || kind === "marriage") return false;
  return true;
}

self.onmessage = (e: MessageEvent) => {
  const { nodes, edges, mode, rootId } = e.data as {
    nodes: any[];
    edges: any[];
    mode?: string;
    rootId?: string | null;
  };

  switch (mode) {
    case "horizontal":
      runOrthogonalLayout(nodes, edges, true);
      break;
    case "circular":
      runRadialAncestors(nodes, edges, rootId ?? null, false);
      break;
    case "fan":
      runRadialAncestors(nodes, edges, rootId ?? null, true);
      break;
    case "tidy":
      runTidyAncestors(nodes, edges, rootId ?? null);
      break;
    case "vertical":
    default:
      runOrthogonalLayout(nodes, edges, false);
      break;
  }
};

// =========================================================
// 1) ORTHOGONAL ENGINE (your feature-preserving version)
// =========================================================
function runOrthogonalLayout(nodes: any[], edges: any[], isHorizontal: boolean) {
  const nodeMap: Record<string, NodeLayout> = {};
  const parentMap: Record<string, string[]> = {};
  const childrenMap: Record<string, string[]> = {};

  for (const n of nodes) {
    nodeMap[n.id] = { id: n.id, width: 0, x: 0, y: 0, spouses: [], generation: 0 };
    parentMap[n.id] = [];
    childrenMap[n.id] = [];
  }

  for (const ed of edges) {
    if (!nodeMap[ed.source] || !nodeMap[ed.target]) continue;
    if (!isParentChildEdge(ed)) continue;
    childrenMap[ed.source].push(ed.target);
    parentMap[ed.target].push(ed.source);
  }

  for (const k of Object.keys(childrenMap)) childrenMap[k] = Array.from(new Set(childrenMap[k]));
  for (const k of Object.keys(parentMap)) parentMap[k] = Array.from(new Set(parentMap[k]));

  const families: Family[] = [];
  const famMap: Record<string, Family> = {};

  for (const [childId, parents] of Object.entries(parentMap)) {
    if (!nodeMap[childId]) continue;

    const uniqueParents = Array.from(new Set(parents)).filter((p) => !!nodeMap[p]);
    if (uniqueParents.length === 0) continue;

    if (uniqueParents.length >= 2) {
      const [a, b] = uniqueParents.sort();
      const key = `${a}|${b}`;
      if (!famMap[key]) famMap[key] = { parents: [a, b], children: [] };
      famMap[key].children.push(childId);

      if (!nodeMap[a].spouses.includes(b)) nodeMap[a].spouses.push(b);
      if (!nodeMap[b].spouses.includes(a)) nodeMap[b].spouses.push(a);
    } else {
      const a = uniqueParents[0];
      const key = `${a}`;
      if (!famMap[key]) famMap[key] = { parents: [a], children: [] };
      famMap[key].children.push(childId);
    }
  }

  for (const f of Object.values(famMap)) {
    f.children = Array.from(new Set(f.children)).sort();
    families.push(f);
  }

  const roots = nodes.filter((n: any) => (parentMap[n.id] || []).length === 0);
  const isParentSomewhere = (id: string) => families.some((f) => f.parents.includes(id));

  const measure = (nodeId: string, visited = new Set<string>()): number => {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);

    const node = nodeMap[nodeId];
    if (!node) return 0;

    const myFamilies = families.filter((f) => f.parents.includes(nodeId));

    const parentsBlockWidth =
      CONFIG.NODE_WIDTH + node.spouses.length * (CONFIG.NODE_WIDTH + CONFIG.SPOUSE_GAP);

    if (myFamilies.length === 0) {
      node.width = parentsBlockWidth;
      return node.width;
    }

    const allKids = myFamilies.flatMap((f) => f.children);

    let childrenTotalWidth = 0;
    allKids.forEach((kidId, i) => {
      childrenTotalWidth += measure(kidId, visited);
      if (i < allKids.length - 1) childrenTotalWidth += CONFIG.SIBLING_GAP;
    });

    node.width = Math.max(parentsBlockWidth, childrenTotalWidth);
    return node.width;
  };

  const place = (nodeId: string, x: number, depth: number, visited = new Set<string>()) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap[nodeId];
    if (!node) return;

    const myFamilies = families.filter((f) => f.parents.includes(nodeId));

    const parentsBlockWidth =
      CONFIG.NODE_WIDTH + node.spouses.length * (CONFIG.NODE_WIDTH + CONFIG.SPOUSE_GAP);

    const parentsStartX = x + (node.width - parentsBlockWidth) / 2;

    node.x = parentsStartX;
    node.y = depth * CONFIG.GENERATION_GAP;
    node.generation = depth;

    node.spouses.forEach((spouseId, idx) => {
      const spouse = nodeMap[spouseId];
      if (!spouse) return;

      spouse.x = parentsStartX + (idx + 1) * (CONFIG.NODE_WIDTH + CONFIG.SPOUSE_GAP);
      spouse.y = node.y;
      spouse.generation = depth;

      if (!isParentSomewhere(spouseId)) visited.add(spouseId);
    });

    const allKids = myFamilies.flatMap((f) => f.children);

    let currentChildX = x;
    const totalKidsWidth =
      allKids.reduce((acc, k) => acc + (nodeMap[k]?.width || 0), 0) +
      Math.max(0, allKids.length - 1) * CONFIG.SIBLING_GAP;

    if (totalKidsWidth < node.width) currentChildX += (node.width - totalKidsWidth) / 2;

    for (const kidId of allKids) {
      place(kidId, currentChildX, depth + 1, visited);
      currentChildX += (nodeMap[kidId]?.width || 0) + CONFIG.SIBLING_GAP;
    }
  };

  for (const r of roots) measure(r.id);

  let globalX = 0;
  for (const r of roots) {
    place(r.id, globalX, 0);
    globalX += (nodeMap[r.id]?.width || 0) + CONFIG.COUSIN_GAP;
  }

  const geometry: RenderLine[] = [];

  for (const fam of families) {
    if (fam.parents.length === 2) {
      const p1 = nodeMap[fam.parents[0]];
      const p2 = nodeMap[fam.parents[1]];
      if (p1 && p2) {
        const midY = p1.y + CONFIG.NODE_HEIGHT / 2;
        geometry.push({
          id: `part-${p1.id}-${p2.id}`,
          x1: p1.x + CONFIG.NODE_WIDTH,
          y1: midY,
          x2: p2.x,
          y2: midY,
          type: "partnership",
          nodeIds: [p1.id, p2.id],
        });
      }
    }

    if (fam.children.length > 0) {
      const p1 = nodeMap[fam.parents[0]];
      const p2 = fam.parents[1] ? nodeMap[fam.parents[1]] : null;
      if (!p1) continue;

      let originX = 0;
      let originY = 0;

      if (p2) {
        originX = (p1.x + CONFIG.NODE_WIDTH + p2.x) / 2;
        originY = p1.y + CONFIG.NODE_HEIGHT / 2;
      } else {
        originX = p1.x + CONFIG.NODE_WIDTH / 2;
        originY = p1.y + CONFIG.NODE_HEIGHT;
      }

      const stemEndY = originY + CONFIG.STEM_LENGTH;

      geometry.push({
        id: `stem-${fam.parents.join("-")}`,
        x1: originX,
        y1: originY,
        x2: originX,
        y2: stemEndY,
        type: "stem",
        nodeIds: [...fam.parents, ...fam.children],
      });

      const childCenters = fam.children
        .map((cid) => nodeMap[cid])
        .filter(Boolean)
        .map((ch) => ch.x + CONFIG.NODE_WIDTH / 2);

      if (childCenters.length === 0) continue;

      const minChildX = Math.min(...childCenters);
      const maxChildX = Math.max(...childCenters);

      if (fam.children.length > 1) {
        geometry.push({
          id: `bus-${fam.parents.join("-")}`,
          x1: minChildX,
          y1: stemEndY,
          x2: maxChildX,
          y2: stemEndY,
          type: "branch",
          nodeIds: [...fam.parents, ...fam.children],
        });
      }

      for (const cid of fam.children) {
        const child = nodeMap[cid];
        if (!child) continue;

        const childCenterX = child.x + CONFIG.NODE_WIDTH / 2;

        geometry.push({
          id: `drop-${fam.parents.join("-")}-${cid}`,
          x1: childCenterX,
          y1: stemEndY,
          x2: childCenterX,
          y2: child.y,
          type: "branch",
          nodeIds: [...fam.parents, cid],
        });
      }
    }
  }

  let finalNodes = nodes.map((n: any) => {
    const layout = nodeMap[n.id];
    return {
      ...n,
      position: { x: layout ? layout.x : 0, y: layout ? layout.y : 0 },
      data: { ...(n.data || {}), generation: layout ? layout.generation : 0 },
    };
  });

  if (isHorizontal) {
    finalNodes = finalNodes.map((n: any) => ({
      ...n,
      position: { x: n.position.y, y: n.position.x },
    }));

    for (let i = 0; i < geometry.length; i++) {
      const l = geometry[i];
      const ox1 = l.x1, oy1 = l.y1, ox2 = l.x2, oy2 = l.y2;
      l.x1 = oy1; l.y1 = ox1;
      l.x2 = oy2; l.y2 = ox2;
    }
  }

  self.postMessage({ nodes: finalNodes, geometry });
}

// =========================================================
// 2) SAFE ANCESTOR HELPERS (for tidy/radial)
// =========================================================
function pickRoot(nodes: any[], rootId: string | null) {
  if (rootId && nodes.some((n) => n.id === rootId)) return rootId;
  return nodes.length ? nodes[0].id : null;
}

function buildParentMap(nodes: any[], edges: any[]) {
  const parentMap: Record<string, string[]> = {};
  for (const n of nodes) parentMap[n.id] = [];
  for (const e of edges.filter(isParentChildEdge)) {
    if (!parentMap[e.target]) parentMap[e.target] = [];
    parentMap[e.target].push(e.source);
  }
  for (const k of Object.keys(parentMap)) parentMap[k] = Array.from(new Set(parentMap[k])).sort();
  return parentMap;
}

function runTidyAncestors(nodes: any[], edges: any[], rootId: string | null) {
  const geometry: RenderLine[] = [];
  const id0 = pickRoot(nodes, rootId);
  if (!id0) return self.postMessage({ nodes: [], geometry: [] });

  const parentMap = buildParentMap(nodes, edges);
  const nodeMap: Record<string, any> = {};
  for (const n of nodes) nodeMap[n.id] = { ...n, x: 0, y: 0 };

  const weightMemo: Record<string, number> = {};
  const getWeight = (id: string): number => {
    if (weightMemo[id] != null) return weightMemo[id];
    const parents = parentMap[id] || [];
    if (parents.length === 0) return (weightMemo[id] = 1);
    let w = 0;
    for (const p of parents) w += getWeight(p);
    return (weightMemo[id] = Math.max(1, w));
  };

  const visited = new Set<string>();
  const layout = (id: string, depth: number, yStart: number, height: number) => {
    if (visited.has(id)) return;
    visited.add(id);

    const node = nodeMap[id];
    node.x = depth * CONFIG.TIDY_X_GAP;
    node.y = yStart + height / 2;
    node.data = { ...(node.data || {}), generation: depth };

    const parents = parentMap[id] || [];
    if (!parents.length) return;

    const totalW = parents.reduce((s, p) => s + getWeight(p), 0);
    let cy = yStart;
    for (const p of parents) {
      const w = getWeight(p);
      const h = (w / totalW) * height;
      layout(p, depth + 1, cy, h);

      const parentNode = nodeMap[p];
      geometry.push({
        id: `direct-${id}-${p}`,
        x1: node.x + CONFIG.NODE_WIDTH,
        y1: node.y,
        x2: parentNode.x,
        y2: parentNode.y,
        type: "direct",
        nodeIds: [id, p],
      });

      cy += h;
    }
  };

  const totalH = getWeight(id0) * CONFIG.TIDY_Y_GAP;
  layout(id0, 0, 0, totalH);

  self.postMessage({
    nodes: Object.values(nodeMap).map((n: any) => ({
      ...n,
      position: { x: n.x, y: n.y },
    })),
    geometry,
  });
}

function runRadialAncestors(nodes: any[], edges: any[], rootId: string | null, isFan: boolean) {
  const geometry: RenderLine[] = [];
  const id0 = pickRoot(nodes, rootId);
  if (!id0) return self.postMessage({ nodes: [], geometry: [] });

  const parentMap = buildParentMap(nodes, edges);
  const nodeMap: Record<string, any> = {};
  for (const n of nodes) nodeMap[n.id] = { ...n, x: 0, y: 0 };

  const weights: Record<string, number> = {};
  const calcWeight = (id: string): number => {
    if (weights[id] != null) return weights[id];
    const parents = parentMap[id] || [];
    if (!parents.length) return (weights[id] = 1);
    weights[id] = parents.reduce((sum, p) => sum + calcWeight(p), 0);
    return weights[id];
  };
  calcWeight(id0);

  const visited = new Set<string>();
  const totalAngle = isFan ? Math.PI : 2 * Math.PI;

  const place = (id: string, depth: number, aStart: number, aEnd: number) => {
    if (visited.has(id)) return;
    visited.add(id);

    const node = nodeMap[id];
    const angle = (aStart + aEnd) / 2;
    const radius = depth * CONFIG.RADIAL_RADIUS_STEP;

    // Fan: rotate so it opens upward
    const ang = isFan ? angle - Math.PI / 2 : angle;

    node.x = Math.cos(ang) * radius;
    node.y = Math.sin(ang) * radius;
    node.data = { ...(node.data || {}), generation: depth };

    const parents = parentMap[id] || [];
    if (!parents.length) return;

    let cur = aStart;
    const myW = Math.max(1, weights[id]);
    const slice = aEnd - aStart;

    for (const p of parents) {
      const pw = Math.max(1, weights[p] ?? 1);
      const ps = (pw / myW) * slice;

      place(p, depth + 1, cur, cur + ps);

      const pn = nodeMap[p];
      geometry.push({
        id: `direct-${id}-${p}`,
        x1: node.x + CONFIG.NODE_WIDTH / 2,
        y1: node.y + CONFIG.NODE_HEIGHT / 2,
        x2: pn.x + CONFIG.NODE_WIDTH / 2,
        y2: pn.y + CONFIG.NODE_HEIGHT / 2,
        type: "direct",
        nodeIds: [id, p],
      });

      cur += ps;
    }
  };

  place(id0, 0, 0, totalAngle);

  self.postMessage({
    nodes: Object.values(nodeMap).map((n: any) => ({
      ...n,
      position: { x: n.x, y: n.y },
    })),
    geometry,
  });
}
