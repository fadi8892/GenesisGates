"use client";

import React, { useMemo, useState } from "react";
import { 
  Search, ChevronRight, ChevronDown, User, Plus, Trash2, FolderOpen 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GraphData } from "./graph/types";

type Props = {
  data: GraphData;
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null) => void;
  onDelete: (id: string) => void;
};

// Recursive Tree Item Component
const TreeItem = ({ node, childrenIds, allNodes, depth, onSelect, activeId, onAdd }: any) => {
  const [isOpen, setIsOpen] = useState(true);
  const isActive = activeId === node.id;
  const hasChildren = childrenIds.length > 0;

  return (
    <div className="select-none">
      <div 
        className={`
          group flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-200
          ${isActive ? "bg-[#0071E3] text-white shadow-sm" : "hover:bg-black/5 text-[#1D1D1F]"}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className={`p-0.5 rounded ${hasChildren ? "opacity-100" : "opacity-0"} ${isActive ? "text-white/80" : "text-gray-400"}`}
        >
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        <User size={14} className={isActive ? "text-white" : "text-blue-500"} />
        <span className="text-sm font-medium truncate flex-1">{node.data?.label || "Unknown"}</span>
        
        <button 
          onClick={(e) => { e.stopPropagation(); onAdd(node.id); }}
          className={`opacity-0 group-hover:opacity-100 p-1 rounded ${isActive ? "hover:bg-white/20 text-white" : "hover:bg-black/10 text-gray-500"}`}
        >
          <Plus size={12} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && hasChildren && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {childrenIds.map((childId: string) => {
              const childNode = allNodes.find((n:any) => n.id === childId);
              if (!childNode) return null;
              // Find grandchildren
              const grandChildren = allNodes.filter((n:any) => n.parentId === childId).map((n:any) => n.id);
              
              return (
                <TreeItem 
                  key={childId} 
                  node={childNode} 
                  childrenIds={grandChildren} 
                  allNodes={allNodes}
                  depth={depth + 1}
                  onSelect={onSelect}
                  activeId={activeId}
                  onAdd={onAdd}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function HierarchyEditor({ data, activeId, onSelect, onAdd, onDelete }: Props) {
  const [search, setSearch] = useState("");

  // Transform Flat Data to Tree Structure
  const treeData = useMemo(() => {
    const nodeMap = new Map();
    // 1. Map all nodes
    data.nodes.forEach(n => nodeMap.set(n.id, { ...n, children: [] }));
    
    // 2. Map relationships
    data.edges.forEach(e => {
      const parent = nodeMap.get(e.source);
      if (parent) parent.children.push(e.target);
    });

    // 3. Find Roots (nodes with no incoming edges)
    const targets = new Set(data.edges.map(e => e.target));
    const roots = data.nodes.filter(n => !targets.has(n.id)).map(n => nodeMap.get(n.id));
    
    return { roots, nodeMap };
  }, [data]);

  // Filter Logic
  const filteredRoots = useMemo(() => {
    if (!search) return treeData.roots;
    return data.nodes.filter(n => n.data.label.toLowerCase().includes(search.toLowerCase()));
  }, [search, treeData, data]);

  return (
    <div className="flex flex-col h-full bg-[#FBFBFD]">
      {/* Search Header */}
      <div className="p-3 border-b border-black/5 bg-white/50 backdrop-blur sticky top-0 z-10">
        <div className="relative group">
          <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..." 
            className="w-full bg-black/5 border-none rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Scrollable Tree */}
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-0.5">
        {search ? (
          // Flat List for Search Results
          <div className="space-y-1">
             <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">Results</div>
             {filteredRoots.map((node: any) => (
                <div key={node.id} onClick={() => onSelect(node.id)} className="flex items-center gap-2 p-2 hover:bg-black/5 rounded-lg cursor-pointer">
                   <Search size={12} className="text-gray-400"/>
                   <span className="text-sm font-medium">{node.data.label}</span>
                </div>
             ))}
          </div>
        ) : (
          // Hierarchical Tree
          <>
            <div className="flex items-center justify-between px-2 py-2 mb-2">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hierarchy</span>
               <button onClick={() => onAdd(null)} className="p-1 hover:bg-black/5 rounded text-blue-600 transition-colors" title="Add Root">
                 <Plus size={14} />
               </button>
            </div>
            
            {treeData.roots.map((root: any) => (
              <TreeItem 
                key={root.id} 
                node={root} 
                childrenIds={root.children}
                allNodes={data.nodes} // Need flat list for lookups
                depth={0} 
                onSelect={onSelect}
                activeId={activeId}
                onAdd={onAdd}
              />
            ))}
            
            {treeData.roots.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                 <FolderOpen size={32} className="opacity-20" />
                 <span className="text-xs">No entries found</span>
                 <button onClick={() => onAdd(null)} className="text-blue-500 text-xs font-bold hover:underline">Create First Person</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}