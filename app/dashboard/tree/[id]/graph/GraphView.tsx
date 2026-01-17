"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Search, RotateCcw, Plus, Minus, ArrowDown, ArrowRight, Circle, Fan,
} from "lucide-react";

import { NodeCard } from "./NodeCard";
import { CanvasEdges } from "./CanvasEdges"; 
import { useLayout } from "./useLayout"; 
import { LayoutMode } from "./layout";

const nodeTypes = { person: NodeCard };

// --- SAFETY: NaN Sanitizer ---
const sanitizeNode = (node: any) => ({
  ...node,
  position: {
    x: Number.isFinite(node.position?.x) ? node.position.x : 0,
    y: Number.isFinite(node.position?.y) ? node.position.y : 0,
  },
});

export default function GraphView({ 
  data, 
  onOpenSidebar, 
  mode,
  activeId,
  // Callbacks
  onRename,
  onAddParent,
  onAddChild,
  onAddPartner
}: { 
  data: any, 
  onOpenSidebar: (id: string) => void, 
  mode: "view" | "editor",
  activeId?: string | null,
  onRename?: (id: string, name: string) => void,
  onAddParent?: (id: string) => void,
  onAddChild?: (id: string) => void,
  onAddPartner?: (id: string) => void
}) {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]); 
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("vertical");
  const [selectedId, setSelectedId] = useState<string | null>(activeId || null);
  const [showSearch, setShowSearch] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // New state for geometry lines (since we don't want to store them in the node objects)
  const [geometry, setGeometry] = useState<any[]>([]);

  useEffect(() => {
    if (activeId !== undefined) setSelectedId(activeId);
  }, [activeId]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ w: width, h: height });
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  // 1. Prepare "Rich" Data (Contains Functions for UI)
  const richNodes = useMemo(() => data.nodes.map((n: any) => ({
      id: n.id, 
      type: "person", 
      data: { 
          ...n.data, 
          id: n.id,
          onRename,
          onAddParent,
          onAddChild,
          onAddPartner
      }, 
      position: { x: 0, y: 0 } 
  })), [data.nodes, onRename, onAddParent, onAddChild, onAddPartner]);

  // 2. Prepare "Clean" Data (For Worker - NO Functions)
  const workerInput = useMemo(() => {
    return richNodes.map((n: any) => {
        // Strip functions from data to avoid DataCloneError
        const cleanData = { ...n.data };
        Object.keys(cleanData).forEach(key => {
            if (typeof cleanData[key] === 'function') delete cleanData[key];
        });
        return { ...n, data: cleanData };
    });
  }, [richNodes]);

  // 3. Async Layout (Uses Clean Data)
  const layoutResult = useLayout(workerInput, data.edges, layoutMode);

  // 4. Merge Results & Update State
  useEffect(() => {
    if (layoutResult.nodes.length > 0) {
        // Create a map of calculated positions
        const posMap = new Map(layoutResult.nodes.map((n: any) => [n.id, n.position]));

        // Merge positions back into the RICH nodes (so we keep the callbacks)
        const mergedNodes = richNodes.map((n: any) => ({
            ...n,
            position: posMap.get(n.id) || n.position
        })).map(sanitizeNode);

        setNodes(mergedNodes);
        setGeometry(layoutResult.geometry || []);
        
        if (!isReady) {
            setTimeout(() => {
                fitView({ duration: 1200, padding: 0.2 });
            }, 100);
            setIsReady(true);
        }
    }
  }, [layoutResult, richNodes, setNodes, fitView, isReady]);

  // 5. Layout Map for Canvas
  const layoutMap = useMemo(() => {
    const byId: Record<string, { x: number; y: number }> = {};
    nodes.forEach((n) => { byId[n.id] = { x: n.position.x, y: n.position.y }; });
    return { byId };
  }, [nodes]);

  const onNodeClick = useCallback((_: any, node: Node) => {
      setSelectedId(node.id);
      onOpenSidebar(node.id);
      if (Number.isFinite(node.position.x) && Number.isFinite(node.position.y)) {
          setCenter(node.position.x + 130, node.position.y + 100, { zoom: 1.2, duration: 1000 });
      }
  }, [onOpenSidebar, setCenter]);

  return (
    <div ref={wrapperRef} className="w-full h-full bg-[#F5F5F7] relative overflow-hidden font-sans">
      
      <CanvasEdges 
        geometry={geometry} // Use geometry from worker
        cam={{ x: viewport.x, y: viewport.y, z: viewport.zoom }}
        size={dimensions}
      />

      <ReactFlow
        nodes={nodes}
        edges={[]} 
        nodeTypes={nodeTypes}
        onMove={(_, vp) => {
            if (Number.isFinite(vp.x) && Number.isFinite(vp.y) && Number.isFinite(vp.zoom)) {
                setViewport(vp);
            }
        }}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelectedId(null)}
        minZoom={0.1}
        maxZoom={3}
        nodesDraggable={false} 
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#000" gap={40} size={1} style={{ opacity: 0.05 }} />
        
        <Panel position="bottom-center" className="mb-8">
            <div className="glass-panel rounded-full p-1.5 flex items-center gap-1 shadow-2xl transition-all hover:scale-105">
                 <ControlButton onClick={() => setShowSearch(!showSearch)} icon={<Search size={18} />} />
                 <div className="w-px h-4 bg-black/10 mx-1" />
                 <ControlButton onClick={() => { setSelectedId(null); fitView({ duration: 1000 }); }} icon={<RotateCcw size={16} />} label="RESET" />
                 <div className="w-px h-4 bg-black/10 mx-1" />
                 <ControlButton onClick={() => zoomOut()} icon={<Minus size={18} />} />
                 <ControlButton onClick={() => zoomIn()} icon={<Plus size={18} />} />
            </div>
        </Panel>

        <Panel position="top-right" className="mt-4 mr-4">
            <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1 shadow-lg min-w-[160px]">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#86868B]">Views</div>
                <LayoutButton active={layoutMode==='vertical'} onClick={() => setLayoutMode('vertical')} icon={<ArrowDown size={16} />} label="Descendancy" />
                <LayoutButton active={layoutMode==='horizontal'} onClick={() => setLayoutMode('horizontal')} icon={<ArrowRight size={16} />} label="Landscape" />
                <LayoutButton active={layoutMode==='circular'} onClick={() => setLayoutMode('circular')} icon={<Circle size={16} />} label="Circular" />
                <LayoutButton active={layoutMode==='fan'} onClick={() => setLayoutMode('fan')} icon={<Fan size={16} />} label="Fan Chart" />
            </div>
        </Panel>

        <AnimatePresence>
            {showSearch && (
                <Panel position="top-center" className="mt-12">
                    <motion.div 
                        initial={{ y: -20, opacity: 0, scale: 0.95 }} 
                        animate={{ y: 0, opacity: 1, scale: 1 }} 
                        exit={{ y: -10, opacity: 0, scale: 0.95 }} 
                        className="glass-panel p-2 rounded-xl shadow-xl backdrop-blur-3xl"
                    >
                        <div className="flex items-center px-3">
                            <Search className="w-5 h-5 text-gray-400 mr-2" />
                            <input 
                                autoFocus 
                                placeholder="Search family..." 
                                className="bg-transparent text-lg text-[#1D1D1F] placeholder:text-[#86868B] outline-none py-3 w-80 font-medium" 
                                onChange={(e) => {
                                    const term = e.target.value.toLowerCase();
                                    if (!term) return;
                                    const target = nodes.find(n => n.data.label.toLowerCase().includes(term));
                                    if(target && Number.isFinite(target.position.x)) {
                                        setSelectedId(target.id);
                                        setCenter(target.position.x, target.position.y, { zoom: 1.5, duration: 800 });
                                    }
                                }}
                            />
                        </div>
                    </motion.div>
                </Panel>
            )}
        </AnimatePresence>
      </ReactFlow>
    </div>
  );
}

function ControlButton({ onClick, icon, label }: any) {
    return (
        <button onClick={onClick} className="p-3 rounded-full hover:bg-black/5 text-[#1D1D1F] transition-colors flex items-center gap-2 group active:scale-90">
            {icon}
            {label && <span className="text-[11px] font-bold tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">{label}</span>}
        </button>
    );
}

function LayoutButton({ onClick, icon, label, active }: any) {
    return (
        <button onClick={onClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300 w-full text-left ${active ? 'bg-white shadow-md text-[#0071E3]' : 'text-[#86868B] hover:bg-black/5 hover:text-[#1D1D1F]'}`}>
            {icon} {label}
        </button>
    );
}