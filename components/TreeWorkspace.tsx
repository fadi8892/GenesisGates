"use client";

import { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
  Panel,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { Plus, Minus, Maximize, Save, Share2, MousePointer2 } from 'lucide-react';
import FamilyNode from './FamilyNode'; // Ensure correct import path

const nodeTypes = {
  family: FamilyNode, // Register the polished node
};

// --- Custom Control Dock Component ---
function ControlDock({ onAdd }: { onAdd: () => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

    return (
        <div className="flex items-center gap-2 p-1.5 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-full shadow-2xl">
      {/* Primary action retains accent colour */}
      <button onClick={onAdd} className="p-2.5 rounded-full bg-accent hover:bg-accent-hover text-white transition-colors" title="Add Node">
        <Plus className="w-5 h-5" />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      {/* Zoom controls use neutral tones for the light theme */}
      <button onClick={() => zoomOut()} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><Minus className="w-4 h-4" /></button>
      <button onClick={() => zoomIn()} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><Plus className="w-4 h-4" /></button>
      <button onClick={() => fitView()} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><Maximize className="w-4 h-4" /></button>
    </div>
  );
}

export default function TreeWorkspace({ treeId, readOnly = false }: { treeId: string; readOnly?: boolean }) {
  // Use 'family' type by default for our custom node
  const initialNodes: Node[] = [
      { id: 'root', type: 'family', position: { x: 0, y: 0 }, data: { label: 'Me', role: 'Root' } }
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--accent)', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const addNode = useCallback(() => {
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'family', // Important: use custom type
      position: { x: Math.random() * 400, y: Math.random() * 400 }, // Random pos for now, later use Dagre
      data: { label: 'New Relative', role: 'Member' },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  return (
    {/*
      The workspace now uses a light neutral background and dark text to create a
      spacious, airy feeling. Previously this container used a very dark
      background (`#050505`) and white text, which made the interface feel
      heavy. Switching to `bg-gray-50 text-gray-900` evokes a modern, Apple‑like
      aesthetic.
    */}
    <div className="h-screen w-full bg-gray-50 text-gray-900">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          /* Use a light background for the canvas itself */
          className="bg-white"
        >
          {/* 1. Cinematic Background */}
          <Background 
             color="#e5e7eb" 
             gap={30} 
             size={1} 
             variant="dots" 
             /* Lighter canvas background to complement the new light theme */
             style={{ backgroundColor: '#f9fafb' }}
          />
          
          {/* 2. Custom Floating Dock (Bottom Center) */}
          {!readOnly && (
             <Panel position="bottom-center" className="mb-8">
                <ControlDock onAdd={addNode} />
             </Panel>
          )}

          {/* 3. Top Left Info Panel (Optional) */}
          <Panel position="top-left" className="m-6">
             <div className="bg-white/80 backdrop-blur-md p-3 rounded-xl border border-gray-200">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Canvas</h2>
                <div className="text-sm font-medium text-gray-600">Viewing {nodes.length} Ancestors</div>
             </div>
          </Panel>

        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}