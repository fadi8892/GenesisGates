"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";
import { Plus, UserPlus, Wand2 } from "lucide-react";

const ease = [0.22, 1, 0.36, 1] as const;

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export default function MemberGraphCard() {
  return (
    <ReactFlowProvider>
      <CardInner />
    </ReactFlowProvider>
  );
}

function CardInner() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const initialNodes: Node[] = useMemo(
    () => [
      {
        id: "root",
        type: "default",
        position: { x: 0, y: 0 },
        data: { label: "You" },
      },
    ],
    []
  );

  const initialEdges: Edge[] = useMemo(() => [], []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      ),
    [setEdges]
  );

  const addMember = useCallback(() => {
    // Create a new node near the last node to keep it calm and “premium”
    const last = nodes[nodes.length - 1];
    const id = makeId("member");

    const nextNode: Node = {
      id,
      position: {
        x: (last?.position?.x ?? 0) + 220,
        y: (last?.position?.y ?? 0) + (nodes.length % 2 === 0 ? 90 : -90),
      },
      data: { label: `Member ${nodes.length}` },
    };

    const nextEdge: Edge = {
      id: makeId("edge"),
      source: "root",
      target: id,
      animated: true,
      style: { strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed },
    };

    // Smooth “appears + connects”
    setNodes((ns) => [...ns, nextNode]);
    setEdges((es) => [...es, nextEdge]);
  }, [nodes, setNodes, setEdges]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
        <div>
          <div className="text-sm font-medium">Member Graph</div>
          <div className="text-xs text-zinc-500">
            Add members and see edges connect smoothly.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addMember}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <UserPlus className="h-4 w-4" />
            Add member
          </button>

          <button
            onClick={() => {
              setNodes([{ id: "root", position: { x: 0, y: 0 }, data: { label: "You" } }]);
              setEdges([]);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            <Plus className="h-4 w-4 rotate-45" />
            Reset
          </button>
        </div>
      </div>

      <motion.div
        ref={wrapperRef}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="h-[420px] overflow-hidden rounded-b-2xl"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          defaultEdgeOptions={{
            animated: true,
            style: { strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <MiniMap pannable zoomable />
          <Controls />
        </ReactFlow>
      </motion.div>

      <div className="flex items-center justify-between px-4 py-3 text-xs text-zinc-500">
        <div className="inline-flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Tip: animate only <span className="text-zinc-700">transform/opacity</span>
        </div>
        <div>Drag nodes • Scroll to zoom • Pan to move</div>
      </div>
    </div>
  );
}
