"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel,
  Node,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Search, RotateCcw, Plus, Minus, ArrowDown, ArrowRight, Circle, Fan, Settings2
} from "lucide-react";

import { NodeCard } from "./NodeCard";
import { CanvasEdges } from "./CanvasEdges"; 
import { useLayout } from "./useLayout"; 
import { LayoutMode } from "./layout";
import ContextMenu from "./ContextMenu";

const nodeTypes = { person: NodeCard };

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
  onRename
}: { 
  data: any, 
  onOpenSidebar: (id: string) => void, 
  mode: "view" | "editor",
  activeId?: string | null,
  onRename?: (id: string, name: string) => void,
}) {
  const { fitView, zoomIn, zoomOut, setCenter, project } = useReactFlow();
  
  // --- STATE ---
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("vertical");
  const [selectedId, setSelectedId] = useState<string | null>(activeId || null);
  const [showSearch, setShowSearch] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [geometry, setGeometry] = useState<any[]>([]);
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);

  // --- HOVER LOGIC ---
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const highlightSet = useMemo(() => {
    if (!hoveredNode) return null;
    const ids = new Set<string>();
    ids.add(hoveredNode);
    // Trace ancestors
    const queue = [hoveredNode];
    while(queue.length > 0) {
      const curr = queue.pop();
      if(!curr) continue;
      data.edges.forEach((e: any) => {
        if(e.target === curr) {
          ids.add(e.source);
          ids.add(e.id);
          queue.push(e.source);
        }
      });
    }
    return ids;
  }, [hoveredNode, data.edges]);

  // --- RESIZE OBSERVER ---
  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ w: width, h: height });
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  // --- LAYOUT ENGINE ---
  const richNodes = useMemo(() => data.nodes.map((n: any) => {
      const isHighlighted = highlightSet ? highlightSet.has(n.id) : true;
      const isDimmed = highlightSet ? !highlightSet.has(n.id) : false;

      return {
        id: n.id, 
        type: "person", 
        data: { 
            ...n.data, 
            id: n.id,
            onRename,
            isDimmed,
            isHighlighted,
        }, 
        position: { x: 0, y: 0 },
        zIndex: isHighlighted ? 10 : 0
      };
  }), [data.nodes, onRename, highlightSet]);

  const cleanNodes = useMemo(() => richNodes.map((n: any) => {
      const { onRename, isDimmed, isHighlighted, ...clean } = n.data;
      return { ...n, data: clean };
  }), [richNodes]);
  
  const layoutResult = useLayout(cleanNodes, data.edges, layoutMode);

  useEffect(() => {
    if (layoutResult.nodes.length > 0) {
        const posMap = new Map(layoutResult.nodes.map((n: any) => [n.id, n.position]));
        const mergedNodes = richNodes.map((n: any) => ({
            ...n,
            position: posMap.get(n.id) || n.position
        })).map(sanitizeNode);

        setNodes(mergedNodes);
        setGeometry(layoutResult.geometry || []);
        
        if (!isReady) {
            setTimeout(() => fitView({ duration: 1200, padding: 0.2 }), 100);
            setIsReady(true);
        }
    }
  }, [layoutResult, richNodes, setNodes, fitView, isReady]);

  // --- INTERACTION HANDLERS ---
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      
      // Calculate position relative to the pane
      const pane = wrapperRef.current?.getBoundingClientRect();
      if(pane) {
          setMenu({
            id: node.id,
            top: event.clientY - pane.top,
            left: event.clientX - pane.left,
          });
      }
    },
    []
  );

  const onPaneClick = useCallback(() => {
      setMenu(null);
      setSelectedId(null);
  }, []);

  const onNodeClick = useCallback((_: any, node: Node) => {
      setMenu(null);
      setSelectedId(node.id);
      onOpenSidebar(node.id);
      if (Number.isFinite(node.position.x) && Number.isFinite(node.position.y)) {
          setCenter(node.position.x + 130, node.position.y + 100, { zoom: 1.2, duration: 1000 });
      }
  }, [onOpenSidebar, setCenter]);

  return (
    <div ref={wrapperRef} className="w-full h-full bg-[#F5F5F7] relative overflow-hidden font-sans">
      
      <CanvasEdges 
        geometry={geometry} 
        cam={{ x: viewport.x, y: viewport.y, z: viewport.zoom }}
        size={dimensions}
        highlightSet={highlightSet}
      />

      <ReactFlow
        nodes={nodes}
        edges={[]} // We use CanvasEdges for performance, so pass empty array here
        nodeTypes={nodeTypes}
        onMove={(_, vp) => {
            if (Number.isFinite(vp.x)) setViewport(vp);
        }}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        minZoom={0.05} // Allow zooming out further for 1000+ nodes
        maxZoom={3}
        
        // --- PERFORMANCE OPTIMIZATION ---
        onlyRenderVisibleElements={true} // <--- THE KEY TO 1000+ NODES
        nodesDraggable={false} 
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#000" gap={40} size={1} style={{ opacity: 0.05 }} />
        
        {/* RIGHT CLICK MENU */}
        {menu && (
            <ContextMenu
                id={menu.id}
                top={menu.top}
                left={menu.left}
                right={0}
                bottom={0}
                onClose={() => setMenu(null)}
                onEdit={onOpenSidebar}
                onAddRelative={(id) => console.log("Add relative to", id)}
            />
        )}

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