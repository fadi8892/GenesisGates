"use client";

import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, Node, Edge, MiniMap, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function Viewer({ mode, treeId }: { mode: "demo" | "share"; treeId: string | null }) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    (async () => {
      if (mode === "demo") {
        // Local demo graph (no DB)
        setNodes([
          { id: "a", position: { x: 0, y: 0 }, data: { label: "Founder" }, type: "default" },
          { id: "b", position: { x: 220, y: 120 }, data: { label: "Child" }, type: "default" },
        ]);
        setEdges([{ id: "e-a-b", source: "a", target: "b", animated: true, style: { strokeWidth: 4, stroke: "#22d3ee" }, markerEnd: { type: MarkerType.ArrowClosed, color: "#22d3ee" } } as Edge]);
        return;
      }

      if (!treeId) return;

      // UPDATED: Fetch from 'nodes' table instead of 'members'
      const { data: dbNodes } = await supabase.from("nodes").select("*").eq("tree_id", treeId);
      const { data: dbEdges } = await supabase.from("edges").select("*").eq("tree_id", treeId);

      setNodes((dbNodes || []).map((n: any) => ({
        id: n.id,
        // Map database fields to ReactFlow format
        position: { x: n.position_x || 0, y: n.position_y || 0 },
        // Use the JSONB data column
        data: { label: n.data?.label || "Unknown", ...n.data },
        type: "default",
      })));

      setEdges((dbEdges || []).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        animated: true,
        style: { strokeWidth: 4, stroke: "#8b5cf6", filter: "drop-shadow(0 0 8px rgba(139,92,246,0.5))" },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6", width: 18, height: 18 },
      })));
    })();
  }, [mode, treeId, supabase]);

  return (
    <div className="h-screen w-screen bg-gradient-to-b from-[#030712] via-[#050505] to-black text-white">
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="font-semibold">{mode === "demo" ? "Demo Tree" : "Viewer"}</div>
        <a href="/" className="text-sm text-white/60 hover:text-white transition">
          Back home →
        </a>
      </div>

      <div className="h-[calc(100vh-64px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          defaultEdgeOptions={{
            type: "smoothstep",
            style: { strokeWidth: 4, stroke: "#8b5cf6" },
            markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#8b5cf6" },
          }}
        >
          <Background gap={42} size={1} color="#0f172a" />
          <MiniMap
            style={{ background: "#0b0b12", borderRadius: 12 }}
            nodeColor={() => "#22d3ee"}
            maskColor="rgba(0,0,0,0.6)"
          />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}