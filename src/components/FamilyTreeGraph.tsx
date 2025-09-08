// src/components/FamilyTreeGraph.tsx
// A simple family tree visualisation component that supports both hierarchical
// (vertical) and radial layouts. It takes the current tree state (people,
// parent/child relationships and spouses) and builds a hierarchical data
// structure. It then computes coordinates for each person depending on the
// chosen layout and renders an SVG with lines and circles. This component
// intentionally avoids any external dependencies so it can be used in the
// browser without extra installs. It is not meant to be a fully fledged
// genealogy viewer like commercial products; rather it demonstrates a
// foundation upon which more advanced features (panning, zooming, pictures,
// drag‑and‑drop editing) can be built.

import React, { useMemo, useState } from 'react';

/** Person type from the tree state. */
export type Person = {
  id: string;
  name?: string;
  sex?: 'M' | 'F' | 'U';
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residencePlace?: string;
};

/** Tree state type from TreeClient. */
export interface TreeState {
  people: Person[];
  links: { parentId: string; childId: string }[];
  spouses: [string, string][];
  geoCache: Record<string, { lat: number; lon: number }>;
}

/** Internal node with children used for hierarchical layout. */
interface Node {
  person: Person;
  children: Node[];
}

/** Node with computed coordinates for radial layout. */
interface PositionedNode extends Node {
  x: number;
  y: number;
  angle: number;
  depth: number;
  parent?: PositionedNode;
}

/** Convert flat state into an array of root nodes. A person is considered a
 * root if they do not have any parent links (no one lists them as a child).
 */
function buildHierarchy(state: TreeState): Node[] {
  const idToPerson = new Map(state.people.map((p) => [p.id, p]));
  const idToChildren: Record<string, string[]> = {};
  for (const link of state.links) {
    idToChildren[link.parentId] = idToChildren[link.parentId] || [];
    idToChildren[link.parentId].push(link.childId);
  }
  const childIds = new Set(state.links.map((l) => l.childId));
  const roots = state.people.filter((p) => !childIds.has(p.id));
  const toNode = (person: Person): Node => ({
    person,
    children: (idToChildren[person.id] || []).map((cid) => toNode(idToPerson.get(cid)!)),
  });
  return roots.map(toNode);
}

/** Assign angles and depths for radial layout. This function recursively
 * partitions a branch's angle range among its children. The root of each
 * separate tree is given the full circle (0–2π) to itself. */
function assignPositions(node: Node, depth: number, start: number, end: number): PositionedNode {
  const pos: PositionedNode = {
    ...node,
    x: 0,
    y: 0,
    angle: (start + end) / 2,
    depth,
  };
  const count = node.children.length;
  if (count > 0) {
    const span = (end - start) / count;
    let current = start;
    pos.children = node.children.map((child) => {
      const childPos = assignPositions(child, depth + 1, current, current + span);
      (childPos as any).parent = pos;
      current += span;
      return childPos;
    });
  } else {
    pos.children = [];
  }
  return pos;
}

/** Compute positioned nodes for each root. */
function computeRadial(state: TreeState): PositionedNode[] {
  const hierarchy = buildHierarchy(state);
  const roots = hierarchy.map((root) => assignPositions(root, 0, 0, 2 * Math.PI));
  return roots;
}

/** Compute simple vertical tree layout using recursion. It returns an array of
 * objects with x/y coordinates, but here we compute y by depth and x by index.
 * This layout is simpler and may overlap if the tree is unbalanced. */
function computeVertical(state: TreeState): PositionedNode[] {
  const hierarchy = buildHierarchy(state);
  // Flatten the nodes with depth-first traversal, assign y by depth and x by order.
  let index = 0;
  const result: PositionedNode[] = [];
  function walk(node: Node, depth: number, parent?: PositionedNode) {
    const pos: PositionedNode = {
      ...node,
      x: index++,
      y: depth,
      angle: 0,
      depth,
      parent,
    };
    result.push(pos);
    node.children.forEach((child) => walk(child, depth + 1, pos));
  }
  hierarchy.forEach((root) => walk(root, 0));
  return result;
}

/** Render the tree using SVG for either radial or vertical layout. */
export default function FamilyTreeGraph({
  state,
  mode = 'radial',
  selectedId,
  onSelect,
  readOnly = false,
}: {
  state: TreeState;
  /** Mode: 'radial' or 'vertical' */
  mode?: 'radial' | 'vertical';
  /** Currently selected person id, used to highlight */
  selectedId?: string;
  /** Callback when a person node is clicked */
  onSelect?: (id: string) => void;
  /** Whether interaction is disabled */
  readOnly?: boolean;
}) {
  const radialRoots = useMemo(() => computeRadial(state), [state]);
  const verticalNodes = useMemo(() => computeVertical(state), [state]);

  // Adjust canvas size depending on layout.
  const width = mode === 'radial' ? 600 : 800;
  const height = mode === 'radial' ? 600 : 400;
  const cx = width / 2;
  const cy = height / 2;
  const maxDepth = Math.max(...radialRoots.map((root) => {
    let md = 0;
    function dfs(n: PositionedNode) {
      md = Math.max(md, n.depth);
      n.children.forEach((c) => dfs(c as PositionedNode));
    }
    dfs(root);
    return md;
  }));
  const radiusStep = (Math.min(width, height) / 2 - 50) / (maxDepth + 1);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        {mode === 'radial'
          ? radialRoots.map((root, i) => {
              const nodes: PositionedNode[] = [];
              function collect(n: PositionedNode) {
                nodes.push(n);
                n.children.forEach((c) => collect(c as PositionedNode));
              }
              collect(root);
              // Compute x/y from angle and depth
              const positions = nodes.map((n) => {
                const r = n.depth * radiusStep;
                return {
                  node: n,
                  x: cx + r * Math.cos(n.angle),
                  y: cy + r * Math.sin(n.angle),
                };
              });
              return (
                <g key={i}>
                  {/* Draw edges */}
                  {positions.map((pos) => {
                    const parent = (pos.node as any).parent as PositionedNode | undefined;
                    if (!parent) return null;
                    // find parent position
                    const parentPos = positions.find((p) => p.node === parent);
                    if (!parentPos) return null;
                    return (
                      <line
                        key={pos.node.person.id + '-edge'}
                        x1={pos.x}
                        y1={pos.y}
                        x2={parentPos.x}
                        y2={parentPos.y}
                        stroke="#8884"
                        strokeWidth={1}
                      />
                    );
                  })}
                  {/* Draw nodes */}
                  {positions.map((pos) => {
                    const id = pos.node.person.id;
                    const isSelected = selectedId === id;
                    return (
                      <g key={id} className="cursor-pointer" onClick={() => onSelect && !readOnly && onSelect(id)}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={isSelected ? 12 : 10}
                          fill={isSelected ? '#6A5DFF' : '#574CDC'}
                          stroke="#F9F9F9"
                          strokeWidth={1}
                        />
                        <text
                          x={pos.x + 12}
                          y={pos.y + 4}
                          fontSize="10"
                          fill="#F9F9F9"
                        >
                          {pos.node.person.name || '—'}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })
          : (() => {
              // vertical layout: scale x positions to width
              const maxX = Math.max(...verticalNodes.map((n) => n.x));
              const scaled = verticalNodes.map((n) => {
                return {
                  node: n,
                  x: 50 + (n.x / (maxX + 1)) * (width - 100),
                  y: 50 + n.y * 80,
                };
              });
              return (
                <g>
                  {scaled.map((pos) => {
                    const parent = pos.node.parent;
                    if (!parent) return null;
                    const parentPos = scaled.find((p) => p.node === parent);
                    if (!parentPos) return null;
                    return (
                      <line
                        key={pos.node.person.id + '-edge'}
                        x1={pos.x}
                        y1={pos.y}
                        x2={parentPos.x}
                        y2={parentPos.y}
                        stroke="#8884"
                        strokeWidth={1}
                      />
                    );
                  })}
                  {scaled.map((pos) => {
                    const id = pos.node.person.id;
                    const isSelected = selectedId === id;
                    return (
                      <g key={id} className="cursor-pointer" onClick={() => onSelect && !readOnly && onSelect(id)}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={isSelected ? 12 : 10}
                          fill={isSelected ? '#6A5DFF' : '#574CDC'}
                          stroke="#F9F9F9"
                          strokeWidth={1}
                        />
                        <text
                          x={pos.x + 12}
                          y={pos.y + 4}
                          fontSize="10"
                          fill="#F9F9F9"
                        >
                          {pos.node.person.name || '—'}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
      </svg>
    </div>
  );
}