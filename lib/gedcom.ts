import { Node, Edge } from 'reactflow';
import dagre from 'dagre';
import { FamilyMemberData } from '@/types/family';

// STRICT ID CLEANER: Removes '@', spaces, and control characters
const cleanID = (raw: string | undefined) => {
  if (!raw) return '';
  return raw.replace(/[@\s\u200B-\u200D\uFEFF]/g, ''); // Removes @, spaces, invisible chars
};

export function parseGedcom(content: string): { nodes: Node[], edges: Edge[] } {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  const individuals: Record<string, any> = {}; 
  const families: Record<string, { husb?: string; wife?: string; children: string[] }> = {};

  let currentId = '';
  let currentType = '';

  // --- PASS 1: PARSE ---
  lines.forEach((line) => {
    // Simple split is safer than Regex for GEDCOM
    const idx = line.indexOf(' ');
    if (idx === -1) return;

    const level = line.substring(0, idx);
    const rest = line.substring(idx + 1).trim();
    
    let tag = '';
    let value = '';

    // Handle: 0 @I1@ INDI
    if (rest.startsWith('@')) {
      const idx2 = rest.indexOf(' ', 1);
      if (idx2 > -1) {
        currentId = cleanID(rest.substring(0, idx2));
        tag = rest.substring(idx2 + 1).trim();
      } else {
        // Edge case: "0 @TRLR@"
        currentId = cleanID(rest);
      }
    } else {
      // Handle: 1 NAME John /Doe/
      const idx2 = rest.indexOf(' ');
      if (idx2 > -1) {
        tag = rest.substring(0, idx2).trim();
        value = rest.substring(idx2 + 1).trim();
      } else {
        tag = rest;
      }
    }

    if (level === '0') {
      if (tag === 'INDI') {
        currentType = 'INDI';
        // Initialize Person
        individuals[currentId] = { 
            id: currentId, 
            label: 'Unknown', 
            gender: 'other',
            birthDate: '', 
            photos: [] 
        };
      } else if (tag === 'FAM') {
        currentType = 'FAM';
        // Initialize Family
        families[currentId] = { children: [] };
      } else {
        currentType = '';
      }
    } else if (currentType === 'INDI') {
      if (tag === 'NAME') individuals[currentId].label = value.replace(/\//g, '');
      if (tag === 'SEX') individuals[currentId].gender = value === 'M' ? 'male' : value === 'F' ? 'female' : 'other';
      if (tag === 'DATE') {
          // Rudimentary check: assume DATE belongs to the previous BIRT tag usually.
          // For a simple parser, if we see a date and don't have one, we take it.
          if(!individuals[currentId].birthDate) individuals[currentId].birthDate = value;
      }
    } else if (currentType === 'FAM') {
      if (tag === 'HUSB') families[currentId].husb = cleanID(value);
      if (tag === 'WIFE') families[currentId].wife = cleanID(value);
      if (tag === 'CHIL') families[currentId].children.push(cleanID(value));
    }
  });

  // --- PASS 2: LAYOUT & EDGES ---
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 200 });
  g.setDefaultEdgeLabel(() => ({}));

  // 1. Add Nodes
  Object.values(individuals).forEach(ind => {
    g.setNode(ind.id, { width: 200, height: 120 });
  });

  const finalEdges: Edge[] = [];

  // 2. Generate Edges (Strict Check)
  Object.values(families).forEach(fam => {
    // Helper to add edge if both exist
    const addLink = (parent: string, child: string) => {
        if (individuals[parent] && individuals[child]) {
            g.setEdge(parent, child);
            finalEdges.push({
                id: `e-${parent}-${child}`,
                source: parent,
                target: child,
                animated: true,
                type: 'smoothstep', // Orthogonal lines (Ancestry style)
                style: { stroke: '#7c3aed', strokeWidth: 2 }
            });
        } else {
            console.warn(`Skipping link: ${parent} -> ${child} (One missing)`);
        }
    };

    if (fam.husb) fam.children.forEach(child => addLink(fam.husb!, child));
    if (fam.wife) fam.children.forEach(child => addLink(fam.wife!, child));
  });

  dagre.layout(g);

  // 3. Final React Flow Nodes
  const finalNodes: Node[] = Object.values(individuals).map(ind => {
    const pos = g.node(ind.id);
    return {
      id: ind.id,
      type: 'familyMember',
      // Fallback to 0,0 if dagre failed to position (orphans)
      position: { x: pos ? pos.x : 0, y: pos ? pos.y : 0 }, 
      data: { 
        label: ind.label,
        gender: ind.gender,
        birthDate: ind.birthDate,
        role: ind.gender === 'male' ? 'Father' : ind.gender === 'female' ? 'Mother' : 'Relative',
        photos: []
      }
    };
  });

  console.log(`Parsed: ${finalNodes.length} Nodes, ${finalEdges.length} Edges`);
  return { nodes: finalNodes, edges: finalEdges };
}

// Keep export helper simple
export function generateGedcom(nodes: Node<FamilyMemberData>[], edges: Edge[]): string {
    /**
     * Convert the in‑memory React Flow representation into a GEDCOM string.  This
     * implementation creates one INDI record per person and derives simple
     * parent → child relationships from directed edges.  Spouse edges are not
     * currently distinguished by the UI, so this helper does not emit HUSB/WIFE
     * pairs unless the gender of a parent can be inferred.
     */
    if (!nodes || nodes.length === 0) return '';

    let gedcom = '';
    const idMap: Record<string, string> = {};
    // Assign unique GEDCOM pointers for individuals
    nodes.forEach((n, idx) => {
        const ptr = `@I${idx + 1}@`;
        idMap[n.id] = ptr;
        gedcom += `0 ${ptr} INDI\n`;
        if (n.data?.label) gedcom += `1 NAME ${n.data.label}\n`;
        const gender = n.data?.gender;
        if (gender === 'male') gedcom += `1 SEX M\n`;
        else if (gender === 'female') gedcom += `1 SEX F\n`;
        else gedcom += `1 SEX U\n`;
        if (n.data?.birthDate) gedcom += `1 BIRT\n2 DATE ${n.data.birthDate}\n`;
        if (n.data?.deathDate) gedcom += `1 DEAT\n2 DATE ${n.data.deathDate}\n`;
    });
    // Build a map of parents to children.  Each directed edge is assumed to
    // represent a parent → child relationship.  Multiple children share the
    // same family record keyed by parent id.
    const famMap: Record<string, { ptr: string; husband?: string; wife?: string; children: string[] }> = {};
    let famIdx = 1;
    edges.forEach(e => {
        const parentId = e.source;
        const childId = e.target;
        if (!parentId || !childId) return;
        let fam = famMap[parentId];
        if (!fam) {
            fam = { ptr: `@F${famIdx}@`, children: [] };
            famMap[parentId] = fam;
            famIdx++;
            // assign husband or wife based on gender
            const parentNode = nodes.find(n => n.id === parentId);
            const gender = parentNode?.data?.gender;
            if (gender === 'male') fam.husband = idMap[parentId];
            else if (gender === 'female') fam.wife = idMap[parentId];
            else fam.husband = idMap[parentId];
        }
        fam.children.push(childId);
    });
    // Emit family records
    Object.values(famMap).forEach(fam => {
        gedcom += `0 ${fam.ptr} FAM\n`;
        if (fam.husband) gedcom += `1 HUSB ${fam.husband}\n`;
        if (fam.wife) gedcom += `1 WIFE ${fam.wife}\n`;
        fam.children.forEach(childId => {
            const cptr = idMap[childId];
            if (cptr) gedcom += `1 CHIL ${cptr}\n`;
        });
    });
    return gedcom;
}