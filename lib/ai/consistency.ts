import { GraphData } from "@/app/dashboard/tree/[id]/graph/types";

export function checkConsistency(data: GraphData) {
  const issues = [];
  
  data.edges.forEach(edge => {
    const parent = data.nodes.find(n => n.id === edge.source);
    const child = data.nodes.find(n => n.id === edge.target);
    
    if (parent && child && parent.data.born_year && child.data.born_year) {
      if (child.data.born_year <= parent.data.born_year) {
        issues.push({
          id: child.id,
          message: `${child.data.label} born before parent ${parent.data.label}`
        });
      }
      if (parent.data.born_year + 12 > child.data.born_year) {
         issues.push({
          id: parent.id,
          message: `Parent ${parent.data.label} extremely young at child's birth`
        });
      }
    }
  });
  return issues;
}