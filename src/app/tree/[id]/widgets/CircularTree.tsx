// src/app/tree/[id]/widgets/CircularTree.tsx
'use client';
import { useMemo } from 'react';

type Person = { id: string; name?: string };
type Link = { parentId: string; childId: string };

function buildAdj(people: Person[], links: Link[]) {
  const byId = new Map(people.map(p => [p.id, p]));
  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const l of links) {
    children.set(l.parentId, [...(children.get(l.parentId)||[]), l.childId]);
    parents.set(l.childId,  [...(parents.get(l.childId)||[]),  l.parentId]);
  }
  // roots = nodes with no parents
  const roots = people.filter(p => !(parents.get(p.id)||[]).length);
  return { byId, children, roots };
}

export default function CircularTree({
  people,
  links,
  size = 680,
}: {
  people: Person[];
  links: Link[];
  size?: number;
}) {
  const { nodes, edges } = useMemo(() => {
    const { byId, children, roots } = buildAdj(people, links);

    // BFS layers
    const layers: string[][] = [];
    let frontier = roots.map(r => r.id);
    const seen = new Set(frontier);
    while (frontier.length) {
      layers.push(frontier);
      const nxt: string[] = [];
      for (const id of frontier) {
        for (const c of (children.get(id)||[])) {
          if (!seen.has(c)) { seen.add(c); nxt.push(c); }
        }
      }
      frontier = nxt;
    }
    if (!layers.length) layers.push([]);

    const R = size/2 - 40;
    const nodes = layers.flatMap((layer, li) => {
      const r = (R * (li+1)) / (layers.length+0.3);
      return layer.map((id, i) => {
        const a = (2*Math.PI * i) / Math.max(1, layer.length);
        const x = size/2 + r * Math.cos(a);
        const y = size/2 + r * Math.sin(a);
        const name = byId.get(id)?.name || id.slice(0,6);
        return { id, x, y, name };
      });
    });

    const pos = new Map(nodes.map(n => [n.id, n]));
    const edges = links
      .filter(l => pos.has(l.parentId) && pos.has(l.childId))
      .map(l => ({ a: pos.get(l.parentId)!, b: pos.get(l.childId)! }));

    return { nodes, edges };
  }, [people, links, size]);

  return (
    <svg width={size} height={size} className="bg-white rounded-xl shadow border">
      <g>
        {edges.map((e, i) => (
          <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke="currentColor" strokeOpacity={0.2}/>
        ))}
      </g>
      <g>
        {nodes.map(n => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <circle r={10} fill="white" stroke="currentColor"/>
            <text x={12} y={4} fontSize="12" className="select-none">{n.name}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
