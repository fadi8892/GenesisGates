"use client";

import React, { useState, useCallback } from "react";
import { ReactFlowProvider } from "reactflow"; // Import the provider
import GraphView from "./graph/GraphView";
import PersonProfile from "./PersonProfile";
import type { GraphData } from "./graph/types";

interface TreeClientProps {
  treeId: string;
  initialData: GraphData;
}

export default function TreeClient({ treeId, initialData }: TreeClientProps) {
  // State to track which person is currently selected in the graph
  // When selected, the sidebar will open
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // --- Handlers ---

  /**
   * Called when a node is clicked in the GraphView
   */
  const handleOpenSidebar = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  /**
   * Called when the user clicks 'Back' or closes the sidebar
   */
  const handleCloseSidebar = useCallback(() => {
    setSelectedId(null);
  }, []);

  /**
   * Handler for renaming a node (passed down to GraphView if editable)
   */
  const handleRename = useCallback((id: string, newName: string) => {
    console.log("Rename requested:", id, newName);
    // TODO: Implement optimistic update or Supabase mutation here
  }, []);

  // --- Render ---

  // We calculate height to fit the viewport minus the parent padding (approx 32px)
  return (
    <div className="w-full h-[calc(100vh-32px)] relative bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      
      {/* FIX: Wrap GraphView in ReactFlowProvider.
        This provides the context required for useReactFlow() hook inside GraphView.
      */}
      <ReactFlowProvider>
        <GraphView 
          data={initialData} 
          onOpenSidebar={handleOpenSidebar}
          mode="editor"
          activeId={selectedId}
          onRename={handleRename}
        />
      </ReactFlowProvider>

      {/* Sidebar Overlay 
        - Slides in when a node is selected
        - Shows details for the selected person
      */}
      {selectedId && (
        <div 
          className="absolute top-0 right-0 w-full max-w-[400px] h-full bg-white shadow-2xl border-l border-gray-200 z-50 overflow-hidden transition-transform duration-300 ease-in-out"
        >
           <PersonProfile 
             data={initialData} 
             personId={selectedId} 
             onBack={handleCloseSidebar}
             onSelect={setSelectedId}
           />
        </div>
      )}
    </div>
  );
}