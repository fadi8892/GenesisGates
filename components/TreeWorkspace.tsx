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
import { Plus, Minus, Maximize, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import FamilyNode from './FamilyNode';

// Register custom node types
const nodeTypes = {
  family: FamilyNode,
};

/**
 * Floating Control Dock for Zoom/Add actions
 */
function ControlDock({ onAdd, loading }: { onAdd: () => void, loading: boolean }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex items-center gap-2 p-1.5 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-full shadow-2xl">
      <button 
        onClick={onAdd} 
        disabled={loading}
        className="p-2.5 rounded-full bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
        title="Add Node"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button onClick={() => zoomOut()} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><Minus className="w-4 h-4" /></button>
      <button onClick={() => zoomIn()} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><Plus className="w-4 h-4" /></button>
      <button onClick={() => fitView()} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"><Maximize className="w-4 h-4" /></button>
    </div>
  );
}

interface TreeWorkspaceProps {
  treeId: string;
  readOnly?: boolean;
}

export default function TreeWorkspace({ treeId, readOnly = false }: TreeWorkspaceProps) {
  const supabase = createClient();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Data Fetching ---
  useEffect(() => {
    if (!treeId) return;

    const fetchTreeData = async () => {
      try {
        setIsSyncing(true);
        
        // 1. Fetch Nodes from Supabase
        const { data: dbNodes, error: nodeError } = await supabase
          .from('nodes')
          .select('*')
          .eq('tree_id', treeId);

        if (nodeError) throw nodeError;

        // 2. Fetch Edges from Supabase
        const { data: dbEdges, error: edgeError } = await supabase
          .from('edges')
          .select('*')
          .eq('tree_id', treeId);

        if (edgeError) throw edgeError;

        // 3. Transform for React Flow
        const flowNodes: Node[] = (dbNodes || []).map((n: any) => ({
          id: n.id,
          type: 'family', // Uses our custom FamilyNode component
          position: { 
            x: n.position_x ?? (Math.random() * 500), 
            y: n.position_y ?? (Math.random() * 500) 
          },
          data: { 
            label: n.data?.label || "Unknown Person",
            role: n.data?.role || "Member",
            ...n.data 
          },
        }));

        const flowEdges: Edge[] = (dbEdges || []).map((e: any) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: true,
          type: 'smoothstep',
          style: { stroke: 'var(--accent)', strokeWidth: 2 },
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err) {
        console.error("Error loading tree:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchTreeData();
  }, [treeId, supabase, setNodes, setEdges]);

  // --- Handlers ---

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      style: { stroke: 'var(--accent)', strokeWidth: 2 } 
    }, eds)),
    [setEdges]
  );

  const addNode = useCallback(async () => {
    if (readOnly) return;
    
    setIsSyncing(true);
    const id = `node_${crypto.randomUUID()}`;
    
    // Create new node object
    const newNode: Node = {
      id,
      type: 'family',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { label: 'New Relative', role: 'Member' },
    };

    // 1. Optimistic UI Update
    setNodes((nds) => [...nds, newNode]);

    // 2. Persist to Supabase
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
      // Rollback on error
      setNodes((nds) => nds.filter(n => n.id !== id));
      alert("Failed to create node. Please try again.");
    }
    
    setIsSyncing(false);
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
          {/* Subtle Grid Background */}
          <Background 
             color="#e5e7eb" 
             gap={30} 
             size={1} 
             variant="dots" 
             style={{ backgroundColor: '#f9fafb' }}
          />
          
          {/* Floating Dock (Only if editable) */}
          {!readOnly && (
             <Panel position="bottom-center" className="mb-8">
                <ControlDock onAdd={addNode} loading={isSyncing} />
             </Panel>
          )}

          {/* Top Left Info Panel */}
          <Panel position="top-left" className="m-6">
             <div className="bg-white/80 backdrop-blur-md p-3 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Canvas</h2>
                <div className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <span>Viewing {nodes.length} Ancestors</span>
                  {isSyncing && <Loader2 className="w-3 h-3 animate-spin text-accent" />}
                </div>
             </div>
          </Panel>

        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}