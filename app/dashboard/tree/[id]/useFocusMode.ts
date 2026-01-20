import { useMemo } from 'react';
import type { GraphData } from './graph/types';
import { isParentChildEdge } from './graph/relationships';

export function useFocusGraph(fullData: GraphData, focusId: string | null) {
  return useMemo(() => {
    // If no one is focused, return empty to keep editor clean
    if (!focusId || !fullData) return { nodes: [], edges: [] };

    const nodesMap = new Map(fullData.nodes.map(n => [n.id, n]));
    const relevantNodeIds = new Set<string>();
    const relevantEdgeIds = new Set<string>();

    // --- HELPER 1: FIND ANCESTORS (Recursive) ---
    // Goes up: Child -> Parent -> Grandparent -> Root
    const getAncestors = (currentId: string, visited = new Set<string>()) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      relevantNodeIds.add(currentId);

      // Find edges where target is currentId (incoming edges from parents)
      fullData.edges.forEach(e => {
        if (!isParentChildEdge(e)) return;
        if (e.target === currentId) {
           relevantNodeIds.add(e.source); // Add Parent
           relevantEdgeIds.add(e.id);     // Add Edge
           getAncestors(e.source, visited); // Recurse Up
        }
      });
    };

    // --- HELPER 2: FIND CHILDREN (Single Level) ---
    // Used to find Siblings (children of parents) and Cousins (children of aunts/uncles)
    const getChildren = (parentId: string) => {
        const childrenIds: string[] = [];
        fullData.edges.forEach(e => {
            if (!isParentChildEdge(e)) return;
            if (e.source === parentId) {
                relevantNodeIds.add(e.target);
                relevantEdgeIds.add(e.id);
                childrenIds.push(e.target);
            }
        });
        return childrenIds;
    };

    // 1. START: Get all ancestors (The vertical backbone)
    // This gives us: Focus Person, Parents, Grandparents, Great-Grandparents...
    getAncestors(focusId);

    // 2. EXPAND: Get Siblings & Aunts/Uncles
    // We iterate through every Ancestor we just found and get their children.
    // - Children of Parents = Your Siblings
    // - Children of Grandparents = Your Aunts/Uncles
    const ancestors = Array.from(relevantNodeIds); 
    const auntsAndUncles: string[] = [];

    ancestors.forEach(ancestorId => {
        // Don't get children of the focus person themselves (unless you want descendants too)
        if (ancestorId !== focusId) { 
            const kids = getChildren(ancestorId);
            
            // Identify Aunts/Uncles (Siblings of your parents)
            // If the ancestor is a Grandparent, their kids are Parents + Aunts/Uncles
            // We can roughly detect this by checking if 'kids' contains one of our direct parents.
            // For simplicity, we just treat this level as potential parents of cousins.
            auntsAndUncles.push(...kids);
        }
    });

    // 3. EXPAND: Get First Cousins
    // Now we take the Aunts/Uncles found above and get *their* children.
    auntsAndUncles.forEach(relativeId => {
        // Avoid getting children of our direct ancestors again (we already have us/siblings)
        if (!ancestors.includes(relativeId)) {
            getChildren(relativeId);
        }
    });

    // --- FILTER FINAL RESULTS ---
    const filteredNodes = fullData.nodes.filter(n => relevantNodeIds.has(n.id));
    const filteredEdges = fullData.edges.filter(e => relevantEdgeIds.has(e.id));

    return { 
      nodes: filteredNodes, 
      edges: filteredEdges 
    };
  }, [fullData, focusId]);
}
