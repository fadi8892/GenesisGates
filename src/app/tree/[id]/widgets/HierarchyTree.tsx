// src/app/tree/[id]/widgets/HierarchyTree.tsx
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
  const roots = people.filter(p => !(parents.get(p.id)||[]).length);
  return { byId, children, roots };
}

export default function HierarchyTree({
  people,
  links,
  width = 900,
  levelGap = 120,
  nodeGap = 120,
}: {
  people: Person[];
  links: Link[];
  width?: number;
  levelGap?: number;
  nodeGap?: number;
}) {
  const { nodes, edges, height } = useMemo(() => {
    const { byId, children, roots } = buildAdj(people, links);

    // DFS layout with x-position packing per level
    const pos = new Map<string, {x:number,y:number,name:string}>();
    let maxY = 0;
    const nextX: Record<number, number> = {};

    function place(id: string, depth: number) {
      const kids = children.get(id)||[];
      const y = depth * levelGap + 40;
      maxY = Math.max(maxY, y);
      if (kids.length === 0) {
        const x = (nextX[depth] ?? nodeGap/2);
        nextX[depth] = x + nodeGap;
        pos.set(id, { x, y, name: byId.get(id)?.name || id.slice(0,6) });
        return x;
      }
      const xs = kids.map(k => place(k, depth+1));
      const x = xs.reduce((a,b)=>a+b,0) / xs.length;
      pos.set(id, { x, y, name: byId.get(id)?.name || id.slice(0,6) });
      return x;
    }

    if (!roots.length && people.length) roots.push(people[0]); // fallback
    roots.forEach(r => place(r.id, 0));

    // Normalize to center in width
    const minX = Math.min(...Array.from(pos.values()).map(p => p.x));
    const maxX = Math.max(...Array.from(pos.values()).map(p => p.x));
    const span = Math.max(1, maxX - minX);
    const scale = (width - 80) / span;

    const nodes = Array.from(pos.entries()).map(([id,p]) => ({
      id,
      x: 40 + (p.x - minX) * scale,
      y: p.y,
      name: p.name,
    }));

    const index = new Map(nodes.map(n => [n.id, n]));
    const edges = links
      .filter(l => index.has(l.parentId) && index.has(l.childId))
      .map(l => ({ a: index.get(l.parentId)!, b: index.get(l.childId)! }));

    return { nodes, edges, height: maxY + 120 };
  }, [people, links, width, levelGap, nodeGap]);

  return (
    <svg width={width} height={height} className="bg-white rounded-xl shadow border">
      <g>
        {edges.map((e, i) => (
          <path key={i}
            d={`M${e.a.x},${e.a.y} C ${e.a.x},${(e.a.y+e.b.y)/2} ${e.b.x},${(e.a.y+e.b.y)/2} ${e.b.x},${e.b.y}`}
            fill="none" stroke="currentColor" strokeOpacity={0.2}/>
        ))}
      </g>
      <g>
        {nodes.map(n => (
          <g key={n.id} transform={`translate(${n.x},${n.y})`}>
            <rect x={-36} y={-16} width={72} height={32} rx={8} fill="white" stroke="currentColor"/>
            <text textAnchor="middle" y={4} fontSize="12" className="select-none">{n.name}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
