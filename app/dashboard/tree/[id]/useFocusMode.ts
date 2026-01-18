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
    const parentMap = new Map<string, string[]>();

    parentEdges.forEach((edge) => {
      const list = parentMap.get(edge.target) ?? [];
      list.push(edge.source);
      parentMap.set(edge.target, list);
    });

    const queue: Array<{ id: string; depth: number }> = [{ id: focusId, depth: 0 }];
    const visited = new Set<string>();
    const maxDepth = 2;

    while (queue.length) {
      const current = queue.shift();
      if (!current || visited.has(current.id)) continue;
      visited.add(current.id);
      relevantNodeIds.add(current.id);

      if (current.depth >= maxDepth) continue;
      const parents = parentMap.get(current.id) ?? [];
      parents.forEach((parentId) => {
        relevantNodeIds.add(parentId);
        queue.push({ id: parentId, depth: current.depth + 1 });
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
