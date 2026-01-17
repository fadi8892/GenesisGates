import { Node, Edge } from "reactflow";

// --- CUSTOM "STRICT PARTITION" LAYOUT ENGINE ---
// This algorithm treats every family branch as a rigid "block" of space.
// It guarantees that cousins NEVER mix with siblings.

export type LayoutMode = "vertical" | "horizontal" | "circular" | "fan";

type TreeSize = { width: number; height: number };

// Configuration for spacing
const CONFIG = {
  NODE_WIDTH: 300,
  NODE_HEIGHT: 180,
  SIBLING_GAP: 50, // Gap between brothers/sisters
  COUSIN_GAP: 300, // Separation between cousin branches
  GENERATION_GAP: 250, // Vertical space between parents and children
};

const computeDepth = (nodes: Node[], edges: Edge[]) => {
  const depthMap = new Map<string, number>();
  const children = new Set(edges.map((e) => e.target));
  const roots = nodes.filter((n) => !children.has(n.id));

  const stack = roots.map((r) => ({ id: r.id, depth: 0 }));
  while (stack.length) {
    const { id, depth } = stack.pop()!;
    if (depthMap.has(id)) continue;
    depthMap.set(id, depth);
    edges
      .filter((e) => e.source === id)
      .forEach((e) => stack.push({ id: e.target, depth: depth + 1 }));
  }

  return depthMap;
};

const verticalLayout = (nodes: Node[], edges: Edge[]) => {
  if (nodes.length === 0) return [];

  // 1. Build an internal tree structure for calculation
  const nodeMap = new Map(
    nodes.map((n) => [
      n.id,
      { ...n, children: [] as string[], width: 0, x: 0, y: 0 },
    ])
  );
  const childrenSet = new Set<string>();

  // Map parent->child relationships
  edges.forEach((e) => {
    const parent = nodeMap.get(e.source);
    if (parent) {
      parent.children.push(e.target);
      childrenSet.add(e.target);
    }
  });

  // Find Root(s) - anyone who isn't a child
  const roots = nodes.filter((n) => !childrenSet.has(n.id)).map((n) => n.id);

  // 2. Recursive Function to Calculate Branch Widths
  const calculateWidths = (nodeId: string): number => {
    const node = nodeMap.get(nodeId);
    if (!node) return 0;

    if (node.children.length === 0) {
      node.width = CONFIG.NODE_WIDTH;
      return node.width;
    }

    let totalWidth = 0;
    node.children.forEach((childId, index) => {
      const childWidth = calculateWidths(childId);
      totalWidth += childWidth;

      if (index < node.children.length - 1) {
        totalWidth += CONFIG.SIBLING_GAP;
      }
    });

    node.width = Math.max(CONFIG.NODE_WIDTH, totalWidth);
    return node.width;
  };

  // 3. Recursive Function to Assign X/Y Positions
  const assignPositions = (nodeId: string, startX: number, depth: number) => {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    node.y = depth * CONFIG.GENERATION_GAP;

    if (node.children.length === 0) {
      node.x = startX;
    } else {
      let currentX = startX;
      node.children.forEach((childId, index) => {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          assignPositions(childId, currentX, depth + 1);
          currentX += childNode.width + CONFIG.SIBLING_GAP;
        }
      });

      const firstChild = nodeMap.get(node.children[0]);
      const lastChild = nodeMap.get(node.children[node.children.length - 1]);
      if (firstChild && lastChild) {
        node.x = (firstChild.x + lastChild.x) / 2;
      }
    }
  };

  // Run the engine on all roots
  let rootStartX = 0;
  roots.forEach((rootId) => {
    calculateWidths(rootId);
    assignPositions(rootId, rootStartX, 0);
    const rootNode = nodeMap.get(rootId);
    rootStartX += (rootNode?.width || 0) + CONFIG.COUSIN_GAP;
  });

  return nodes.map((n) => {
    const calculated = nodeMap.get(n.id);
    return {
      ...n,
      position: { x: calculated?.x || 0, y: calculated?.y || 0 },
      targetPosition: "top",
      sourcePosition: "bottom",
    };
  });
};

const horizontalLayout = (nodes: Node[], edges: Edge[]) => {
  // Swap axes for sideways reading
  return verticalLayout(nodes, edges).map((n) => ({
    ...n,
    position: { x: n.position.y, y: n.position.x },
    targetPosition: "left",
    sourcePosition: "right",
  }));
};

const circularLayout = (nodes: Node[], edges: Edge[]) => {
  if (!nodes.length) return [];
  const depthMap = computeDepth(nodes, edges);
  const maxDepth = Math.max(...Array.from(depthMap.values()), 1);
  const radiusStep = 260;
  return nodes.map((n, idx) => {
    const depth = depthMap.get(n.id) ?? 0;
    const radius = 200 + depth * radiusStep;
    const angle = (idx / nodes.length) * Math.PI * 2;
    return {
      ...n,
      position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
      targetPosition: "top",
      sourcePosition: "bottom",
    };
  });
};

const fanLayout = (nodes: Node[], edges: Edge[]) => {
  if (!nodes.length) return [];
  const depthMap = computeDepth(nodes, edges);
  const spread = Math.PI * 1.2; // 216 degrees
  return nodes.map((n, idx) => {
    const depth = depthMap.get(n.id) ?? 0;
    const angle = -spread / 2 + (idx / Math.max(nodes.length - 1, 1)) * spread;
    const radius = 180 + depth * 180;
    return {
      ...n,
      position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius + depth * 120 },
      targetPosition: "top",
      sourcePosition: "bottom",
    };
  });
};

export const computeLayout = (
  nodes: Node[],
  edges: Edge[],
  mode: LayoutMode = "vertical"
) => {
  switch (mode) {
    case "horizontal":
      return horizontalLayout(nodes, edges);
    case "circular":
      return circularLayout(nodes, edges);
    case "fan":
      return fanLayout(nodes, edges);
    case "vertical":
    default:
      return verticalLayout(nodes, edges);
  }
};
