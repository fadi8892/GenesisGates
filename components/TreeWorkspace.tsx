"use client";

import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
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
import { Plus, Minus, Maximize } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import FamilyNode from './FamilyNode';

const nodeTypes = {
  family: FamilyNode,
};

// --- Custom Control Dock Component ---
function ControlDock({ onAdd }: { onAdd: () => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex items-center gap-2 p-1.5 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-full shadow-2xl">
      <button onClick={onAdd} className="p-2.5 rounded-full bg-accent hover:bg-accent-hover text-white transition-colors" title="Add Node">
        <Plus className="w-5 h-5" />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button onClick={() => zoomOut()} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><Minus className="w-4 h-4" /></button>
      <button onClick={() => zoomIn()} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><Plus className="w-4 h-4" /></button>
      <button onClick={() => fitView()} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><Maximize className="w-4 h-4" /></button>
    </div>
  );
}

export default function TreeWorkspace({ treeId, readOnly = false }: { treeId: string; readOnly?: boolean }) {
  const supabase = createClient();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch Data from Supabase
  useEffect(() => {
    if (!treeId) return;

    const fetchTree = async () => {
      // 1. Fetch Nodes
      const { data: dbNodes, error: nodeError } = await supabase
        .from('nodes')
        .select('*')
        .eq('tree_id', treeId);

      if (nodeError) console.error('Error fetching nodes:', nodeError);

      // 2. Fetch Edges
      const { data: dbEdges, error: edgeError } = await supabase
        .from('edges')
        .select('*')
        .eq('tree_id', treeId);

      if (edgeError) console.error('Error fetching edges:', edgeError);

      if (dbNodes) {
        const flowNodes = dbNodes.map((n: any) => ({
          id: n.id,
          type: 'family',
          position: { x: n.position_x || 0, y: n.position_y || 0 },
          data: n.data || { label: 'Unknown' },
        }));
        setNodes(flowNodes);
      }

      if (dbEdges) {
        const flowEdges = dbEdges.map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          style: { stroke: 'var(--accent)', strokeWidth: 2 },
        }));
        setEdges(flowEdges);
      }
    };

    fetchTree();
  }, [treeId, supabase, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'var(--accent)', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const addNode = useCallback(async () => {
    if (readOnly) return;
    
    const id = `node_${Date.now()}`;
    const newNode: Node = {
      id,
      type: 'family',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: 'New Relative', role: 'Member' },
    };

    // Optimistic UI update
    setNodes((nds) => [...nds, newNode]);

    // Persist to Supabase
    const { error } = await supabase.from('nodes').insert({
      id: newNode.id,
      tree_id: treeId,
      type: newNode.type,
      position_x: newNode.position.x,
      position_y: newNode.position.y,
      data: newNode.data
    });

    if (error) {
      console.error("Failed to save node:", error);
      // Rollback
      setNodes((nds) => nds.filter(n => n.id !== id));
    }
  }, [treeId, readOnly, setNodes, supabase]);

  return (
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
          className="bg-white"
        >
          <Background 
             color="#e5e7eb" 
             gap={30} 
             size={1} 
             variant="dots" 
             style={{ backgroundColor: '#f9fafb' }}
          />
          
          {!readOnly && (
             <Panel position="bottom-center" className="mb-8">
                <ControlDock onAdd={addNode} />
             </Panel>
          )}

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