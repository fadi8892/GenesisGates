import { useMemo } from 'react';
import type { GraphData } from './graph/types';

export function useFocusGraph(fullData: GraphData, focusId: string | null) {
  return useMemo(() => {
    // If no one is focused, return empty to keep editor clean
    if (!focusId || !fullData) return { nodes: [], edges: [] };

    const relevantNodeIds = new Set<string>();
    const relevantEdgeIds = new Set<string>();

    const isParentChildEdge = (edge: GraphData["edges"][number]) => {
      const kind = (edge?.type ?? "").toString().toLowerCase();
      if (!kind) return true;
      return !(kind === "partner" || kind === "spouse" || kind === "marriage");
    };

    const parentEdges = fullData.edges.filter(isParentChildEdge);
    const childMap = new Map<string, string[]>();

    parentEdges.forEach((edge) => {
      const list = childMap.get(edge.source) ?? [];
      list.push(edge.target);
      childMap.set(edge.source, list);
    });

    const queue: Array<{ id: string; depth: number }> = [{ id: focusId, depth: 0 }];
    const visited = new Set<string>();
    const maxDepth = 3;

    while (queue.length) {
      const current = queue.shift();
      if (!current || visited.has(current.id)) continue;
      visited.add(current.id);
      relevantNodeIds.add(current.id);

      if (current.depth >= maxDepth) continue;
      const children = childMap.get(current.id) ?? [];
      children.forEach((childId) => {
        relevantNodeIds.add(childId);
        queue.push({ id: childId, depth: current.depth + 1 });
      });
    }

    parentEdges.forEach((edge) => {
      if (relevantNodeIds.has(edge.source) && relevantNodeIds.has(edge.target)) {
        relevantEdgeIds.add(edge.id);
      }
    });

    // --- FILTER FINAL RESULTS ---
    const filteredNodes = fullData.nodes.filter((n) => relevantNodeIds.has(n.id));
    const filteredEdges = fullData.edges.filter((e) => relevantEdgeIds.has(e.id));

    return { 
      nodes: filteredNodes, 
      edges: filteredEdges 
    };
  }, [fullData, focusId]);
}
