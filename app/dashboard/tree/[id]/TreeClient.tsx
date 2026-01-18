"use client";

import React, { useState, useCallback } from "react";
import { ReactFlowProvider } from "reactflow";
import { LayoutDashboard, Eye, Edit3, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import GraphView from "./graph/GraphView";
import PersonProfile from "./PersonProfile";
import HierarchyEditor from "./HierarchyEditor";
import type { GraphData } from "./graph/types";

interface TreeClientProps {
  treeId: string;
  initialData: GraphData;
}

export default function TreeClient({ treeId, initialData }: TreeClientProps) {
  const supabase = createClient();
  
  // State for the Tree Data
  const [graphData, setGraphData] = useState<GraphData>(initialData);
  const [mode, setMode] = useState<"view" | "editor">("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- ACTIONS ---

  const handleAddNode = useCallback(async (parentId: string | null) => {
    if (!treeId) {
      alert("Tree ID is missing.");
      return;
    }

    setIsSaving(true);
    // Generate valid UUIDs
    const newNodeId = crypto.randomUUID();
    const newEdgeId = crypto.randomUUID(); 
    
    // 1. Create Node
    const newNode = {
      id: newNodeId,
      tree_id: treeId,
      type: 'person',
      position_x: 0,
      position_y: 0,
      data: { 
        label: "New Person", 
        role: parentId ? "Child" : "Root",
        born_year: null,
        died_year: null,
      }
    };

    // 2. Create Edge (simplified structure)
    // Removed 'type' field to match the working GEDCOM importer
    let newEdge = null;
    if (parentId) {
      newEdge = {
        id: newEdgeId,
        tree_id: treeId,
        source: parentId,
        target: newNodeId
      };
    }

    // 3. Optimistic Update
    setGraphData(prev => ({
      nodes: [...prev.nodes, newNode],
      edges: newEdge ? [...prev.edges, newEdge] : prev.edges
    }));

    // 4. Persist
    try {
      // Insert Node
      const { error: nodeError } = await supabase.from('nodes').insert(newNode);
      if (nodeError) {
        throw new Error(`Node Insert Failed: ${nodeError.message}`);
      }

      // Insert Edge
      if (newEdge) {
        console.log("Inserting Edge:", newEdge); // Debug log
        const { error: edgeError } = await supabase.from('edges').insert(newEdge);
        
        if (edgeError) {
          console.error("Full Edge Error:", edgeError);
          // Cleanup orphan node
          await supabase.from('nodes').delete().eq('id', newNodeId); 
          throw new Error(`Edge Insert Failed: ${edgeError.message} (Code: ${edgeError.code})`);
        }
      }
    } catch (error: any) {
      console.error("Save Operation Failed:", error);
      alert(error.message);
      
      // Rollback UI
      setGraphData(prev => ({
        nodes: prev.nodes.filter(n => n.id !== newNodeId),
        edges: prev.edges.filter(e => e.id !== newEdgeId)
      }));
    } finally {
      setIsSaving(false);
    }
  }, [treeId, supabase]);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    if (!confirm("Are you sure you want to delete this person?")) return;
    
    setIsSaving(true);

    // 1. Optimistic Update
    setGraphData(prev => ({
      nodes: prev.nodes.filter(n => n.id !== nodeId),
      edges: prev.edges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));
    
    if (selectedId === nodeId) setSelectedId(null);

    // 2. Persist
    try {
      const { error } = await supabase.from('nodes').delete().eq('id', nodeId);
      if (error) throw error;
    } catch (error: any) {
      console.error("Delete failed:", error);
      alert("Failed to delete node.");
    } finally {
      setIsSaving(false);
    }
  }, [supabase, selectedId]);

  // --- HANDLERS ---

  const handleOpenSidebar = useCallback((id: string) => setSelectedId(id), []);
  const handleCloseSidebar = useCallback(() => setSelectedId(null), []);

  const handleRename = useCallback(async (id: string, newName: string) => {
     // Optimistic
     setGraphData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === id ? { ...n, data: { ...n.data, label: newName } } : n)
     }));

     // Persist
     const target = graphData.nodes.find(n => n.id === id);
     if(target) {
        const updatedData = { ...target.data, label: newName };
        await supabase.from('nodes').update({ data: updatedData }).eq('id', id);
     }
  }, [graphData.nodes, supabase]);

  return (
    <div className="flex w-full h-[calc(100vh-32px)] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
      
      {/* LEFT SIDEBAR */}
      {mode === "editor" && (
        <div className="w-72 bg-white border-r border-gray-200 flex-shrink-0 z-10 flex flex-col transition-all duration-300">
          <div className="p-3 border-b border-gray-100 font-semibold text-xs text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> Structure
            </div>
            {isSaving && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <HierarchyEditor 
              data={graphData} 
              activeId={selectedId} 
              onSelect={handleOpenSidebar}
              onAdd={handleAddNode}
              onDelete={handleDeleteNode}
            />
          </div>
        </div>
      )}

      {/* MAIN CANVAS */}
      <div className="flex-1 relative h-full bg-[#F5F5F7]">
        
        {/* Toggle Mode */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <div className="bg-white/90 backdrop-blur-md border border-gray-200/50 p-1 rounded-lg shadow-lg flex gap-1">
            <button 
              onClick={() => setMode("view")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                mode === "view" ? "bg-black text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <Eye className="w-3 h-3" /> View
            </button>
            <button 
              onClick={() => setMode("editor")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                mode === "editor" ? "bg-black text-white shadow-sm" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          </div>
        </div>

        <ReactFlowProvider>
          <GraphView 
            data={graphData} 
            onOpenSidebar={handleOpenSidebar}
            mode={mode}
            activeId={selectedId}
            onRename={handleRename}
            onAddChild={(id) => handleAddNode(id)}
            onAddParent={(id) => console.log("Add parent not implemented yet")} 
          />
        </ReactFlowProvider>
      </div>

      {/* RIGHT SIDEBAR */}
      {selectedId && (
        <div className="absolute top-0 right-0 w-full max-w-[400px] h-full bg-white shadow-2xl border-l border-gray-200 z-50 overflow-hidden transition-transform duration-300 ease-in-out">
           <PersonProfile 
             data={graphData} 
             personId={selectedId} 
             onBack={handleCloseSidebar}
             onSelect={setSelectedId}
           />
        </div>
      )}
    </div>
  );
}