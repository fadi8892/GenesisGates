"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useReactFlow,
  Panel,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Plus,
  Minus,
  ArrowDown,
  ArrowRight,
  Circle,
  Fan,
  Home,
  Sparkles,
  MousePointer2,
  Rocket,
} from "lucide-react";

import { NodeCard } from "./NodeCard";
import { CanvasEdges } from "./CanvasEdges";
import { useLayout } from "./useLayout";
import { LayoutMode } from "./layout";
import { useFocusGraph } from "../useFocusMode";
import ContextMenu from "./ContextMenu";

const nodeTypes = { person: NodeCard };

// Keep positions sane
const sanitizeNode = (node: any) => ({
  ...node,
  position: {
    x: Number.isFinite(node.position?.x) ? node.position.x : 0,
    y: Number.isFinite(node.position?.y) ? node.position.y : 0,
  },
});

type ContextState = {
  type: "node" | "pane";
  id?: string | null;
  top: number;
  left: number;
};

export default function GraphView({
  data,
  onOpenSidebar,
  mode,
  activeId,
  onRename,
  onAddParent,
  onAddChild,
  onAddPartner,
  onDelete,
  onAddRoot,
}: {
  data: any;
  onOpenSidebar: (id: string) => void;
  mode: "view" | "editor";
  activeId?: string | null;
  onRename?: (id: string, name: string) => void;
  onAddParent?: (id: string) => void;
  onAddChild?: (id: string) => void;
  onAddPartner?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddRoot?: () => void;
}) {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>("vertical");
  const [selectedId, setSelectedId] = useState<string | null>(activeId || null);
  const [showSearch, setShowSearch] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [geometry, setGeometry] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextState | null>(null);

  // --- SYNC activeId from parent ---
  useEffect(() => {
    if (activeId !== undefined) setSelectedId(activeId);
  }, [activeId]);

  // --- RESIZE OBSERVER ---
  useEffect(() => {
    if (!wrapperRef.current) return;
    const obs = new ResizeObserver((entries) => {
      setDimensions({
        w: entries[0].contentRect.width,
        h: entries[0].contentRect.height,
      });
    });
    obs.observe(wrapperRef.current);
    return () => obs.disconnect();
  }, []);

  // --- HOVER HIGHLIGHT/DIM (RESTORED) ---
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const highlightSet = useMemo(() => {
    if (!hoveredNode) return null;

    const ids = new Set<string>();
    ids.add(hoveredNode);

    const queue = [hoveredNode];
    while (queue.length > 0) {
      const curr = queue.pop();
      if (!curr) continue;

      (data?.edges || []).forEach((e: any) => {
        // ancestor chain only: parent -> child edges (follow e.target === curr)
        if (e?.target === curr) {
          if (e?.source) ids.add(e.source);
          if (e?.id) ids.add(e.id);
          queue.push(e.source);
        }
      });
    }

    return ids;
  }, [hoveredNode, data?.edges]);

  // --- LOD CALCULATION (KEPT + SAFE) ---
  const lodLevel = useMemo(() => {
    const z = viewport.zoom;

    // Circular/Fan denser -> dots sooner
    if (layoutMode === "circular" || layoutMode === "fan") {
      if (z < 0.5) return "tiny";
      if (z < 1.2) return "low";
      return "high";
    }

    // Vertical/Horizontal
    if (z < 0.25) return "tiny";
    if (z < 0.65) return "low";
    return "high";
  }, [viewport.zoom, layoutMode]);

  // --- Focus Mode (KEPT) ---
  const focusData = useFocusGraph(
    data,
    mode === "editor" ? activeId || null : null
  );

  // Dataset to render
  const activeData = mode === "editor" && activeId ? focusData : data;

  // --- Semantic Zoom (RESTORED - View Mode Only) ---
  const maxVisibleGeneration = useMemo(() => {
    if (mode === "editor") return 999;
    if (viewport.zoom > 0.8) return 999;
    if (viewport.zoom > 0.4) return 3;
    return 0;
  }, [viewport.zoom, mode]);

  // --- LAYOUT INPUT (FULL GRAPH for stable positioning) ---
  const workerInput = useMemo(() => {
    return (data?.nodes || []).map((n: any) => {
      const cleanData = { ...(n?.data || {}) };
      Object.keys(cleanData).forEach((k) => {
        if (typeof cleanData[k] === "function") delete cleanData[k];
      });
      return {
        id: n.id,
        type: "person",
        data: cleanData,
        position: { x: 0, y: 0 },
      };
    });
  }, [data?.nodes]);

  const effectiveLayoutMode: LayoutMode =
    mode === "editor" ? "vertical" : layoutMode;
  const layoutResult = useLayout(
    workerInput,
    data?.edges || [],
    effectiveLayoutMode
  );

  // --- FINAL NODE MERGE (RESTORED: semantic filter + highlight flags + zIndex) ---
  useEffect(() => {
    if (!layoutResult?.nodes || layoutResult.nodes.length === 0) return;

    const layoutMap = new Map<string, any>(
      layoutResult.nodes.map((n: any) => [n.id, n])
    );

    let filteredNodes = activeData?.nodes || [];

    // Semantic zoom filter (View Mode only)
    if (mode === "view") {
      filteredNodes = filteredNodes.filter((n: any) => {
        const layoutNode = layoutMap.get(n.id);
        const genFromLayout = layoutNode?.data?.generation;
        const genFromNode = n?.data?.generation;

        const generation =
          typeof genFromLayout === "number"
            ? genFromLayout
            : typeof genFromNode === "number"
              ? genFromNode
              : 0;

        return generation <= maxVisibleGeneration;
      });
    }

    const mergedNodes = filteredNodes
      .map((n: any) => {
        const layoutNode = layoutMap.get(n.id);

        const isHighlighted = highlightSet ? highlightSet.has(n.id) : true;
        const isDimmed = highlightSet ? !highlightSet.has(n.id) : false;

        return {
          ...n,
          type: "person",
          position: layoutNode?.position || { x: 0, y: 0 },
          data: {
            ...(n?.data || {}),
            id: n.id,

            // hover dim/highlight
            isDimmed,
            isHighlighted,

            // lod + mode
            mode,
            lod: lodLevel,

            // callbacks
            onRename,
            onAddParent,
            onAddChild,
            onAddPartner,
            onDelete,
          },
          zIndex: isHighlighted ? 10 : 0,
        };
      })
      .map(sanitizeNode);

    setNodes(mergedNodes);
    setGeometry(layoutResult.geometry || []);

    // Auto-fit: first load only (don’t fight user after)
    if (!isReady) {
      setTimeout(() => fitView({ duration: 1200, padding: 0.12 }), 100);
      setIsReady(true);
    }
  }, [
    layoutResult,
    activeData,
    mode,
    maxVisibleGeneration,
    lodLevel,
    highlightSet,
    onRename,
    onAddParent,
    onAddChild,
    onAddPartner,
    onDelete,
    setNodes,
    fitView,
    isReady,
  ]);

  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      setSelectedId(node.id);
      onOpenSidebar(node.id);

      // Zoom to High Detail on click
      if (
        Number.isFinite(node.position.x) &&
        Number.isFinite(node.position.y)
      ) {
        setCenter(node.position.x + 130, node.position.y + 80, {
          zoom: 1.5,
          duration: 1200,
        });
      }
    },
    [onOpenSidebar, setCenter]
  );

  const onPaneClick = useCallback(() => {
    setSelectedId(null);
    setContextMenu(null);
  }, []);

  const handleContextMenu = useCallback(
    (
      event: React.MouseEvent,
      type: "node" | "pane",
      id?: string | null
    ) => {
      event.preventDefault();
      if (!wrapperRef.current) return;
      const bounds = wrapperRef.current.getBoundingClientRect();
      const left = Math.min(
        event.clientX - bounds.left,
        bounds.width - 240
      );
      const top = Math.min(
        event.clientY - bounds.top,
        bounds.height - 240
      );

      setContextMenu({ type, id, left: Math.max(left, 12), top: Math.max(top, 12) });
    },
    []
  );

  const resetView = useCallback(() => {
    setSelectedId(null);
    fitView({ duration: 1000, padding: 0.12 });
  }, [fitView]);

  const activeNodeLabel = useMemo(() => {
    if (!contextMenu?.id) return null;
    const found = nodes.find((n: any) => n.id === contextMenu.id);
    return found?.data?.label ?? "Unknown";
  }, [contextMenu?.id, nodes]);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full relative overflow-hidden font-sans"
      style={{
        background:
          "radial-gradient(circle at top, rgba(199,210,254,0.55), rgba(255,255,255,0.7) 45%, rgba(226,232,255,0.35) 70%, rgba(240,244,255,0.9))",
      }}
    >
      <CanvasEdges
        geometry={geometry}
        cam={{ x: viewport.x, y: viewport.y, z: viewport.zoom }}
        size={dimensions}
        // fade lines out when tiny mode, but keep highlight otherwise
        highlightSet={lodLevel === "tiny" ? new Set() : highlightSet}
      />

      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onMove={(_, vp) => {
          if (
            Number.isFinite(vp.x) &&
            Number.isFinite(vp.y) &&
            Number.isFinite(vp.zoom)
          ) {
            setViewport(vp);
          }
        }}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onNodeContextMenu={(event, node) =>
          handleContextMenu(event, "node", node.id)
        }
        onPaneContextMenu={(event) => handleContextMenu(event, "pane")}
        minZoom={0.01}
        maxZoom={4}
        onlyRenderVisibleElements={true}
        nodesDraggable={mode === "editor"}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#000" gap={40} size={1} style={{ opacity: 0.04 }} />

        {/* Top hint */}
        <Panel position="top-left" className="mt-5 ml-5">
          <div className="glass-panel rounded-2xl px-4 py-3 shadow-xl border border-white/60 bg-white/70 backdrop-blur-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-lg">
              <Rocket size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400 font-bold">
                Magic Map
              </p>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MousePointer2 size={14} className="text-purple-500" /> Right-click for
                superpowers
              </p>
            </div>
          </div>
        </Panel>

        {/* Bottom dock */}
        <Panel position="bottom-center" className="mb-8">
          <div className="glass-panel rounded-full p-2 flex items-center gap-2 shadow-2xl transition-all hover:scale-105 bg-white/80 backdrop-blur-2xl border border-white/60">
            <ControlButton
              onClick={() => setShowSearch(!showSearch)}
              icon={<Search size={18} />}
              label="FIND"
            />
            <div className="w-px h-5 bg-black/10 mx-1" />
            <ControlButton
              onClick={resetView}
              icon={<Home size={18} />}
              label="HOME"
            />
            <ControlButton
              onClick={() => zoomOut()}
              icon={<Minus size={18} />}
              label="ZOOM OUT"
            />
            <ControlButton
              onClick={() => zoomIn()}
              icon={<Plus size={18} />}
              label="ZOOM IN"
            />
            <div className="w-px h-5 bg-black/10 mx-1" />
            <ControlButton
              onClick={() => setShowSearch(!showSearch)}
              icon={<Sparkles size={18} />}
              label="WOW"
            />
          </div>
        </Panel>

        {/* Layout menu (View only) - RESTORED full options */}
        {mode === "view" && (
          <Panel position="top-right" className="mt-5 mr-5">
            <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1 shadow-lg min-w-[170px] bg-white/80 backdrop-blur-2xl border border-white/60">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#86868B]">
                Layout
              </div>

              <LayoutButton
                active={layoutMode === "vertical"}
                onClick={() => setLayoutMode("vertical")}
                icon={<ArrowDown size={16} />}
                label="Descendancy"
              />
              <LayoutButton
                active={layoutMode === "horizontal"}
                onClick={() => setLayoutMode("horizontal")}
                icon={<ArrowRight size={16} />}
                label="Landscape"
              />
              <LayoutButton
                active={layoutMode === "circular"}
                onClick={() => setLayoutMode("circular")}
                icon={<Circle size={16} />}
                label="Circular"
              />
              <LayoutButton
                active={layoutMode === "fan"}
                onClick={() => setLayoutMode("fan")}
                icon={<Fan size={16} />}
                label="Fan Chart"
              />
            </div>
          </Panel>
        )}

        {/* Search */}
        <AnimatePresence>
          {showSearch && (
            <Panel position="top-center" className="mt-12">
              <motion.div
                initial={{ y: -20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -10, opacity: 0, scale: 0.95 }}
                className="glass-panel p-2 rounded-2xl shadow-xl backdrop-blur-3xl bg-white/90 border border-white/60"
              >
                <div className="flex items-center px-3">
                  <Search className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    autoFocus
                    placeholder="Search family..."
                    className="bg-transparent text-lg text-[#1D1D1F] placeholder:text-[#86868B] outline-none py-3 w-80 font-medium"
                    onChange={(e) => {
                      const term = e.target.value.toLowerCase().trim();
                      if (!term) return;

                      const target = nodes.find((n: any) => {
                        const lbl = (n?.data?.label ?? "").toString().toLowerCase();
                        return lbl.includes(term);
                      });

                      if (
                        target &&
                        Number.isFinite(target.position.x) &&
                        Number.isFinite(target.position.y)
                      ) {
                        setSelectedId(target.id);
                        setCenter(target.position.x, target.position.y, {
                          zoom: 1.5,
                          duration: 800,
                        });
                      }
                    }}
                  />
                </div>
              </motion.div>
            </Panel>
          )}
        </AnimatePresence>

        {/* Right click context menu */}
        {contextMenu && (
          <ContextMenu
            top={contextMenu.top}
            left={contextMenu.left}
            nodeId={contextMenu.type === "node" ? contextMenu.id : null}
            nodeLabel={contextMenu.type === "node" ? activeNodeLabel : null}
            canEdit={mode === "editor"}
            onClose={() => setContextMenu(null)}
            onOpenProfile={(id) => {
              setSelectedId(id);
              onOpenSidebar(id);
            }}
            onAddParent={onAddParent}
            onAddChild={onAddChild}
            onAddPartner={onAddPartner}
            onDelete={onDelete}
            onAddRoot={onAddRoot}
            onResetView={resetView}
          />
        )}
      </ReactFlow>
    </div>
  );
}

function ControlButton({ onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full hover:bg-black/5 text-[#1D1D1F] transition-colors flex items-center gap-2 group active:scale-95"
    >
      {icon}
      {label && (
        <span className="text-[11px] font-bold tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">
          {label}
        </span>
      )}
    </button>
  );
}

function LayoutButton({ onClick, icon, label, active }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300 w-full text-left ${
        active
          ? "bg-white shadow-md text-[#7C3AED]"
          : "text-[#86868B] hover:bg-black/5 hover:text-[#1D1D1F]"
      }`}
    >
      {icon} {label}
    </button>
  );
}
