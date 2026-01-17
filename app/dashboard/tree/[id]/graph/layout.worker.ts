/**
 * GENESIS GATES: ORTHOGONAL LAYOUT ENGINE (Final Version)
 * * LOGIC:
 * 1. Nuclear Families: Groups nodes into (Parent + Spouse + Children) units.
 * 2. Block Packing: Calculates the exact width of every family unit recursively.
 * 3. Orthogonal Routing: Generates 3-segment lines (Bridge -> Stem -> Branch) instead of direct curves.
 */

// --- CONFIGURATION ---
const CONFIG = {
  // Card Dimensions (Must match NodeCard.tsx)
  NODE_WIDTH: 280,
  NODE_HEIGHT: 160,
  
  // Spacing
  SPOUSE_GAP: 40,      // Gap between Husband and Wife
  SIBLING_GAP: 60,     // Gap between brothers/sisters
  COUSIN_GAP: 150,     // Gap between distinct family branches
  GENERATION_GAP: 250, // Vertical drop between generations
  
  // Line Geometry
  STEM_LENGTH: 40,     // Length of the vertical drop from parents
};

// --- TYPES ---
type RenderLine = {
  id: string;
  x1: number; 
  y1: number; 
  x2: number; 
  y2: number; 
  type: 'partnership' | 'stem' | 'branch';
};

type NodeLayout = {
  id: string;
  width: number; // Total width of this person's subtree
  x: number;
  y: number;
  spouses: string[];
  children: string[];
  generation: number;
};

self.onmessage = (e: MessageEvent) => {
  const { nodes, edges, mode } = e.data;

  // ---------------------------------------------------------
  // 1. DATA STRUCTURES & PRE-PROCESSING
  // ---------------------------------------------------------
  const nodeMap: Record<string, NodeLayout> = {};
  const parentMap: Record<string, string[]> = {}; // child -> parents
  const childrenMap: Record<string, string[]> = {}; // parent -> children
  
  // Initialize Maps
  nodes.forEach((n: any) => {
    nodeMap[n.id] = { 
      id: n.id, 
      width: 0, 
      x: 0, 
      y: 0, 
      spouses: [], 
      children: [],
      generation: 0
    };
    childrenMap[n.id] = [];
    parentMap[n.id] = [];
  });

  // Map Relationships
  edges.forEach((e: any) => {
    if (nodeMap[e.source] && nodeMap[e.target]) {
      childrenMap[e.source].push(e.target);
      parentMap[e.target].push(e.source);
    }
  });

  // ---------------------------------------------------------
  // 2. INFER NUCLEAR FAMILIES
  // ---------------------------------------------------------
  // We identify "Spouses" by finding people who share children.
  const processedSpouses = new Set<string>();
  const families: { parents: string[], children: string[] }[] = [];

  nodes.forEach((n: any) => {
    const myChildren = childrenMap[n.id];
    if (myChildren.length === 0) return;

    // Group my children by their "other parent"
    const spouseGroups: Record<string, string[]> = {};
    const singleParentKids: string[] = [];

    myChildren.forEach(childId => {
      const parents = parentMap[childId];
      const otherParent = parents.find(p => p !== n.id);
      
      if (otherParent) {
        if (!spouseGroups[otherParent]) spouseGroups[otherParent] = [];
        spouseGroups[otherParent].push(childId);
      } else {
        singleParentKids.push(childId);
      }
    });

    // Create Couple Families
    Object.entries(spouseGroups).forEach(([spouseId, kids]) => {
      // Create relationship only once (use ID comparison to avoid duplicates)
      if (n.id < spouseId) {
        families.push({ parents: [n.id, spouseId], children: kids });
        // Link in graph
        nodeMap[n.id].spouses.push(spouseId);
        nodeMap[spouseId].spouses.push(n.id);
      }
    });

    // Create Single Parent Families
    if (singleParentKids.length > 0) {
       // Ensure these kids aren't already covered
       const uniqueKids = singleParentKids.filter(k => 
         !families.some(f => f.children.includes(k))
       );
       if (uniqueKids.length > 0) {
         families.push({ parents: [n.id], children: uniqueKids });
       }
    }
  });

  // Find Root Nodes (No parents in this dataset)
  const roots = nodes.filter((n: any) => parentMap[n.id].length === 0);

  // ---------------------------------------------------------
  // 3. RECURSIVE LAYOUT (MEASURE & PLACE)
  // ---------------------------------------------------------
  
  // PHASE A: MEASURE (Bottom-Up)
  // Determine how wide every branch needs to be.
  const measure = (nodeId: string, visited = new Set<string>()): number => {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);

    const node = nodeMap[nodeId];
    
    // Find all families where this person is a parent
    const myFamilies = families.filter(f => f.parents.includes(nodeId));
    
    // If leaf node (no children)
    if (myFamilies.length === 0) {
      // Width = Me + Spouses
      const spouseWidth = node.spouses.length * (CONFIG.NODE_WIDTH + CONFIG.SPOUSE_GAP);
      node.width = CONFIG.NODE_WIDTH + spouseWidth;
      return node.width;
    }

    // Measure all children
    let childrenTotalWidth = 0;
    const allKids = myFamilies.flatMap(f => f.children);
    
    allKids.forEach((kidId, i) => {
      childrenTotalWidth += measure(kidId, visited);
      if (i < allKids.length - 1) childrenTotalWidth += CONFIG.SIBLING_GAP;
    });

    // Parent Block Width (Me + Spouses)
    const parentsBlockWidth = CONFIG.NODE_WIDTH + (node.spouses.length * (CONFIG.NODE_WIDTH + CONFIG.SPOUSE_GAP));

    // My total width is the MAX of (Parents vs Children)
    node.width = Math.max(parentsBlockWidth, childrenTotalWidth);
    return node.width;
  };

  // PHASE B: PLACE (Top-Down)
  // Assign X/Y coordinates based on reserved widths.
  const place = (nodeId: string, x: number, depth: number, visited = new Set<string>()) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap[nodeId];
    const myFamilies = families.filter(f => f.parents.includes(nodeId));

    // 1. Position Parents Block (Centered in reserved space)
    const parentsBlockWidth = CONFIG.NODE_WIDTH + (node.spouses.length * (CONFIG.NODE_WIDTH + CONFIG.SPOUSE_GAP));
    const parentsStartX = x + (node.width - parentsBlockWidth) / 2;

    node.x = parentsStartX;
    node.y = depth * CONFIG.GENERATION_GAP;

    // Position Spouses to the right of the main node
    node.spouses.forEach((spouseId, idx) => {
       const spouse = nodeMap[spouseId];
       // Mark spouse as visited so we don't move them again
       visited.add(spouseId); 
       spouse.x = parentsStartX + ((idx + 1) * (CONFIG.NODE_WIDTH + CONFIG.SPOUSE_GAP));
       spouse.y = node.y;
    });

    // 2. Position Children (Below parents)
    let currentChildX = x;
    
    // If children are narrower than parents, center the children block
    const allKids = myFamilies.flatMap(f => f.children);
    const totalKidsWidth = allKids.reduce((acc, k) => acc + nodeMap[k].width, 0) + (Math.max(0, allKids.length-1) * CONFIG.SIBLING_GAP);
    
    if (totalKidsWidth < node.width) {
        currentChildX += (node.width - totalKidsWidth) / 2;
    }

    // Process each family unit's children
    myFamilies.forEach(fam => {
       fam.children.forEach(kidId => {
          place(kidId, currentChildX, depth + 1, visited);
          currentChildX += nodeMap[kidId].width + CONFIG.SIBLING_GAP;
       });
    });
  };

  // EXECUTE LAYOUT
  roots.forEach((r: any) => measure(r.id));
  
  let globalX = 0;
  roots.forEach((r: any) => {
    place(r.id, globalX, 0);
    globalX += nodeMap[r.id].width + CONFIG.COUSIN_GAP;
  });

  // ---------------------------------------------------------
  // 4. GENERATE LINES (The "Perfect Connection" Logic)
  // ---------------------------------------------------------
  const geometry: RenderLine[] = [];

  families.forEach(fam => {
     // A. PARTNERSHIP LINE (Connects Parents)
     if (fam.parents.length === 2) {
        const p1 = nodeMap[fam.parents[0]];
        const p2 = nodeMap[fam.parents[1]];
        if (!p1 || !p2) return;

        // Draw line from center-right of P1 to center-left of P2
        // Actually, let's just connect center-to-center for simplicity in rendering
        const midY = p1.y + CONFIG.NODE_HEIGHT / 2;
        
        geometry.push({
            id: `part-${p1.id}-${p2.id}`,
            x1: p1.x + CONFIG.NODE_WIDTH, // Right edge of P1
            y1: midY,
            x2: p2.x, // Left edge of P2
            y2: midY,
            type: 'partnership'
        });
     }

     // B. CHILDREN LINES (Stem + Branch)
     if (fam.children.length > 0) {
        const p1 = nodeMap[fam.parents[0]];
        const p2 = fam.parents[1] ? nodeMap[fam.parents[1]] : null;
        
        // 1. Calculate Stem Origin
        let originX = 0;
        let originY = 0;

        if (p2) {
            // Drop from the center of the Partnership Line
            originX = (p1.x + CONFIG.NODE_WIDTH + p2.x) / 2;
            originY = p1.y + CONFIG.NODE_HEIGHT / 2;
        } else {
            // Single parent: Drop from bottom center
            originX = p1.x + CONFIG.NODE_WIDTH / 2;
            originY = p1.y + CONFIG.NODE_HEIGHT;
        }

        // 2. Draw Vertical Stem
        const stemEndY = p1.y + CONFIG.NODE_HEIGHT + CONFIG.STEM_LENGTH;
        geometry.push({
            id: `stem-${fam.parents.join('-')}`,
            x1: originX, y1: originY,
            x2: originX, y2: stemEndY,
            type: 'stem'
        });

        // 3. Draw Horizontal Bus (Connects all children stems)
        // Find left-most and right-most child centers
        const firstChild = nodeMap[fam.children[0]];
        const lastChild = nodeMap[fam.children[fam.children.length-1]];
        
        const minChildX = firstChild.x + CONFIG.NODE_WIDTH/2;
        const maxChildX = lastChild.x + CONFIG.NODE_WIDTH/2;

        if (fam.children.length > 1) {
            geometry.push({
                id: `bus-${fam.parents.join('-')}`,
                x1: minChildX, y1: stemEndY,
                x2: maxChildX, y2: stemEndY,
                type: 'branch'
            });
        }

        // 4. Draw Drop Lines (From Bus to Child Top)
        fam.children.forEach(cid => {
            const child = nodeMap[cid];
            const childCenterX = child.x + CONFIG.NODE_WIDTH/2;
            
            // If single child, the bus doesn't exist, so we connect directly from stem end
            // If multiple, we connect from the bus Y
            geometry.push({
                id: `drop-${cid}`,
                x1: childCenterX, y1: stemEndY,
                x2: childCenterX, y2: child.y,
                type: 'branch'
            });
        });
     }
  });

  // ---------------------------------------------------------
  // 5. OUTPUT
  // ---------------------------------------------------------
  const finalNodes = nodes.map((n: any) => {
    const layout = nodeMap[n.id];
    return {
        ...n,
        position: { x: layout ? layout.x : 0, y: layout ? layout.y : 0 }
    };
  });

  self.postMessage({ nodes: finalNodes, geometry });
};