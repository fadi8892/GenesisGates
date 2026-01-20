"use client";

import React, { useCallback, useMemo, useState } from "react";
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

type DbNode = {
  id: string;
  tree_id: string;
  type: string;
  position_x: number;
  position_y: number;
  data: any;
};

type DbEdge = {
  id: string;
  tree_id: string;
  source: string;
  target: string;
  // Optional fields (some schemas have them, some don’t)
  kind?: string;
  type?: string;
  data?: any;
};

export default function TreeClient({ treeId, initialData }: TreeClientProps) {
  const supabase = createClient();

  const [graphData, setGraphData] = useState<GraphData>(initialData);
  const [mode, setMode] = useState<"view" | "editor">("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // -------- helpers --------

  const upsertLocalNode = useCallback((nodeId: string, patch: (prev: any) => any) => {
    setGraphData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: patch(n.data ?? {}) } : n
      ),
    }));
  }, []);

  const removeLocalNodeAndEdges = useCallback((nodeId: string) => {
    setGraphData((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));
  }, []);

  const addLocalNodeAndMaybeEdge = useCallback((newNode: DbNode, newEdge: DbEdge | null) => {
    setGraphData((prev) => ({
      nodes: [...prev.nodes, newNode],
      edges: newEdge ? [...prev.edges, newEdge] : prev.edges,
    }));
  }, []);

  // This tries edge insert with extra fields (like kind) and falls back if schema doesn't support them.
  const insertEdgeWithFallback = useCallback(
    async (edge: DbEdge) => {
      // Try first
      const { error: eErr1 } = await supabase.from("edges").insert(edge);
      if (!eErr1) return;

      // If schema rejects unknown column(s), retry with common alternate fields.
      if (edge.kind && !edge.type) {
        const typeFallback: DbEdge = {
          ...edge,
          type: edge.kind,
        };
        const { error: eErr2 } = await supabase.from("edges").insert(typeFallback);
        if (!eErr2) return;
      }

      // Final fallback: minimal shape only.
      const minimal: DbEdge = {
        id: edge.id,
        tree_id: edge.tree_id,
        source: edge.source,
        target: edge.target,
      };

      const { error: eErr3 } = await supabase.from("edges").insert(minimal);
      if (eErr3) throw eErr3;
    },
    [supabase]
  );

  // Generic create function used by add-child/add-parent/add-partner/root
  const saveNodeAndEdge = useCallback(
    async (newNode: DbNode, newEdge: DbEdge | null) => {
      if (!treeId) {
        alert("Tree ID is missing.");
        return;
      }

      setIsSaving(true);

      // 1) Optimistic UI
      addLocalNodeAndMaybeEdge(newNode, newEdge);

      // 2) Persist
      try {
        const { error: nErr } = await supabase.from("nodes").insert(newNode);
        if (nErr) throw nErr;

        if (newEdge) {
          await insertEdgeWithFallback(newEdge);
        }
      } catch (err: any) {
        console.error("Save failed:", err);

        // Rollback UI
        setGraphData((prev) => ({
          nodes: prev.nodes.filter((n) => n.id !== newNode.id),
          edges: prev.edges.filter((e) => e.id !== newEdge?.id),
        }));

        alert(err?.message || "Save failed.");
      } finally {
        setIsSaving(false);
      }
    },
    [addLocalNodeAndMaybeEdge, insertEdgeWithFallback, supabase, treeId]
  );

  // -------- actions --------

  // Old: generic add node (root if parentId null)
  const handleAddNode = useCallback(
    async (parentId: string | null) => {
      const newNodeId = crypto.randomUUID();
      const newEdgeId = crypto.randomUUID();

      const newNode: DbNode = {
        id: newNodeId,
        tree_id: treeId,
        type: "person",
        position_x: 0,
        position_y: 0,
        data: {
          label: parentId ? "New Child" : "New Person",
          role: parentId ? "Child" : "Root",
          born_year: null,
          died_year: null,
        },
      };

      const newEdge: DbEdge | null = parentId
        ? {
            id: newEdgeId,
            tree_id: treeId,
            source: parentId,
            target: newNodeId,
          }
        : null;

      await saveNodeAndEdge(newNode, newEdge);
    },
    [saveNodeAndEdge, treeId]
  );

  // New: explicit actions for node hover buttons
  const handleAddChild = useCallback(
    async (parentId: string) => {
      await handleAddNode(parentId);
    },
    [handleAddNode]
  );

  const handleAddParent = useCallback(
    async (childId: string) => {
      const newNodeId = crypto.randomUUID();
      const newEdgeId = crypto.randomUUID();

      const newNode: DbNode = {
        id: newNodeId,
        tree_id: treeId,
        type: "person",
        position_x: 0,
        position_y: 0,
        data: {
          label: "New Parent",
          role: "Parent",
          born_year: null,
          died_year: null,
        },
      };

      // Edge from Parent -> Child
      const newEdge: DbEdge = {
        id: newEdgeId,
        tree_id: treeId,
        source: newNodeId,
        target: childId,
      };

      await saveNodeAndEdge(newNode, newEdge);
    },
    [saveNodeAndEdge, treeId]
  );

  const handleAddPartner = useCallback(
    async (personId: string) => {
      // Creates a partner node AND links it with a partner edge if your schema supports it.
      // If not, it will still create the node + attempt minimal edge insert.
      const newNodeId = crypto.randomUUID();
      const newEdgeId = crypto.randomUUID();

      const newNode: DbNode = {
        id: newNodeId,
        tree_id: treeId,
        type: "person",
        position_x: 0,
        position_y: 0,
        data: {
          label: "New Partner",
          role: "Partner",
          born_year: null,
          died_year: null,
        },
      };

      const partnerEdge: DbEdge = {
        id: newEdgeId,
        tree_id: treeId,
        source: personId,
        target: newNodeId,
        kind: "partner", // will fallback if column doesn't exist
        type: "partner",
        data: { kind: "partner" },
      };

      await saveNodeAndEdge(newNode, partnerEdge);
    },
    [saveNodeAndEdge, treeId]
  );

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      if (!confirm("Are you sure you want to delete this person?")) return;

      setIsSaving(true);

      // Optimistic UI
      removeLocalNodeAndEdges(nodeId);
      if (selectedId === nodeId) setSelectedId(null);

      try {
        const { error } = await supabase.from("nodes").delete().eq("id", nodeId);
        if (error) throw error;
      } catch (err: any) {
        console.error("Delete failed:", err);
        alert(err?.message || "Failed to delete node.");

        // (Optional) You could refetch here; for now we leave UI optimistic.
      } finally {
        setIsSaving(false);
      }
    },
    [removeLocalNodeAndEdges, selectedId, supabase]
  );

  const handleRename = useCallback(
    async (nodeId: string, newName: string) => {
      const nextName = (newName ?? "").trim();
      if (!nextName) return;

      setIsSaving(true);

      // 1) Optimistic UI
      upsertLocalNode(nodeId, (prevData) => ({ ...prevData, label: nextName }));

      // 2) Persist using a safe snapshot of current node data
      try {
        const node = graphData.nodes.find((n) => n.id === nodeId);
        const baseData = node?.data ?? {};
        const updatedData = { ...baseData, label: nextName };

        const { error } = await supabase
          .from("nodes")
          .update({ data: updatedData })
          .eq("id", nodeId);

        if (error) throw error;
      } catch (err: any) {
        console.error("Rename failed:", err);
        alert(err?.message || "Rename failed.");
      } finally {
        setIsSaving(false);
      }
    },
    [graphData.nodes, supabase, upsertLocalNode]
  );

  // -------- handlers --------

  const handleOpenSidebar = useCallback((id: string) => setSelectedId(id), []);
  const handleCloseSidebar = useCallback(() => setSelectedId(null), []);

  const canAddFromSidebar = useMemo(() => mode === "editor", [mode]);

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
              // If nothing selected, add a root node. If selected, add child of selected.
              onAdd={
                canAddFromSidebar
                  ? (parentId: string | null) => handleAddNode(parentId)
                  : undefined
              }
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
                mode === "view"
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <Eye className="w-3 h-3" /> View
            </button>
            <button
              onClick={() => setMode("editor")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                mode === "editor"
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-100"
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
            onAddChild={handleAddChild}
            onAddParent={handleAddParent}
            onAddPartner={handleAddPartner}
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
