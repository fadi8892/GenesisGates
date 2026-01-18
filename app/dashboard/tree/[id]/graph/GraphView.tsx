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
  RotateCcw,
  Plus,
  Minus,
  ArrowDown,
  ArrowRight,
  Circle,
  Fan,
  SlidersHorizontal,
} from "lucide-react";

import { NodeCard } from "./NodeCard";
import { CanvasEdges } from "./CanvasEdges";
import { useLayout } from "./useLayout";
import { LayoutMode } from "./layout";
import { useFocusGraph } from "../useFocusMode";

const nodeTypes = { person: NodeCard };

// Keep positions sane
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
  onRename,
  onAddParent,
  onAddChild,
  onAddPartner,
}: {
  data: any;
  onOpenSidebar: (id: string) => void;
  mode: "view" | "editor";
  activeId?: string | null;
  onRename?: (id: string, name: string) => void;
  onAddParent?: (id: string) => void;
  onAddChild?: (id: string) => void;
  onAddPartner?: (id: string) => void;
}) {
  const { fitView, zoomIn, zoomOut, setCenter, setViewport: setFlowViewport } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 1 });
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>("vertical");
  const [selectedId, setSelectedId] = useState<string | null>(activeId || null);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [geometry, setGeometry] = useState<any[]>([]);
  const [lineWeight, setLineWeight] = useState(2.6);
  const [lineContrast, setLineContrast] = useState(0.7);
  const [lineGlow, setLineGlow] = useState(true);
  const [cardRadius, setCardRadius] = useState(22);
  const [cardGlow, setCardGlow] = useState(true);

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
    const z = viewState.zoom;

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
  }, [viewState.zoom, layoutMode]);

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
    if (viewState.zoom > 0.8) return 999;
    if (viewState.zoom > 0.4) return 3;
    return 0;
  }, [viewState.zoom, mode]);

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

  const effectiveLayoutMode: LayoutMode = mode === "editor" ? "vertical" : layoutMode;
  const layoutResult = useLayout(workerInput, data?.edges || [], effectiveLayoutMode);

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
            onOpenSidebar,
            ui: {
              cardRadius,
              cardGlow,
            },
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
    onOpenSidebar,
    cardRadius,
    cardGlow,
    setNodes,
    fitView,
    isReady,
  ]);

  const lineStyle = useMemo(() => {
    const clampedContrast = Math.min(1, Math.max(0, lineContrast));
    const baseAlpha = 0.35 + clampedContrast * 0.45;
    const highlightAlpha = 0.6 + clampedContrast * 0.35;
    const dimAlpha = 0.18 + clampedContrast * 0.25;

    return {
      baseWidth: lineWeight,
      highlightWidth: lineWeight + 1.4,
      minWidth: 1.6,
      color: `rgba(71, 85, 105, ${baseAlpha.toFixed(2)})`,
      highlightColor: `rgba(59, 130, 246, ${highlightAlpha.toFixed(2)})`,
      dimColor: `rgba(148, 163, 184, ${dimAlpha.toFixed(2)})`,
      glow: lineGlow,
    };
  }, [lineContrast, lineGlow, lineWeight]);

  const handleReset = useCallback(() => {
    setSelectedId(null);
    setShowSearch(false);
    if ((layoutResult?.nodes || []).length > 0) {
      requestAnimationFrame(() => fitView({ duration: 900, padding: 0.12 }));
    } else {
      setFlowViewport({ x: 0, y: 0, zoom: 1 }, { duration: 600 });
    }
  }, [fitView, layoutResult?.nodes, setFlowViewport]);

  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      setSelectedId(node.id);
      onOpenSidebar(node.id);

      // Zoom to High Detail on click
      if (Number.isFinite(node.position.x) && Number.isFinite(node.position.y)) {
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
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full bg-[#F5F5F7] relative overflow-hidden font-sans"
    >
      <CanvasEdges
        geometry={geometry}
        cam={{ x: viewState.x, y: viewState.y, z: viewState.zoom }}
        size={dimensions}
        // fade lines out when tiny mode, but keep highlight otherwise
        highlightSet={lodLevel === "tiny" ? new Set() : highlightSet}
        lineStyle={lineStyle}
      />

      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={nodeTypes}
        onMove={(_, vp) => {
          if (Number.isFinite(vp.x) && Number.isFinite(vp.y) && Number.isFinite(vp.zoom)) {
            setViewState(vp);
          }
        }}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        minZoom={0.01}
        maxZoom={4}
        onlyRenderVisibleElements={true}
        nodesDraggable={mode === "editor"}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#000" gap={40} size={1} style={{ opacity: 0.05 }} />

        {/* Bottom dock */}
        <Panel position="bottom-center" className="mb-8">
          <div className="glass-panel rounded-full p-1.5 flex items-center gap-1 shadow-2xl transition-all hover:scale-105">
            <ControlButton
              onClick={() => setShowSearch(!showSearch)}
              icon={<Search size={18} />}
            />
            <div className="w-px h-4 bg-black/10 mx-1" />
            <ControlButton
              onClick={handleReset}
              icon={<RotateCcw size={16} />}
              label="RESET"
            />
            <div className="w-px h-4 bg-black/10 mx-1" />
            <ControlButton onClick={() => zoomOut()} icon={<Minus size={18} />} />
            <ControlButton onClick={() => zoomIn()} icon={<Plus size={18} />} />
          </div>
        </Panel>

        <Panel position="top-left" className="mt-4 ml-4">
          <div className="glass-panel rounded-2xl p-2 shadow-lg w-[220px]">
            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest text-[#1D1D1F] hover:bg-black/5 transition"
            >
              Display
              <SlidersHorizontal size={14} />
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-2 pt-3 flex flex-col gap-3">
                    <SettingsSlider
                      label="Line weight"
                      value={lineWeight}
                      min={1.6}
                      max={4.5}
                      step={0.1}
                      onChange={setLineWeight}
                    />
                    <SettingsSlider
                      label="Line contrast"
                      value={lineContrast}
                      min={0.2}
                      max={1}
                      step={0.05}
                      onChange={setLineContrast}
                    />
                    <SettingsToggle
                      label="Line glow"
                      checked={lineGlow}
                      onChange={setLineGlow}
                    />
                    <SettingsSlider
                      label="Card roundness"
                      value={cardRadius}
                      min={16}
                      max={32}
                      step={1}
                      onChange={setCardRadius}
                    />
                    <SettingsToggle
                      label="Card glow"
                      checked={cardGlow}
                      onChange={setCardGlow}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Panel>

        {/* Layout menu (View only) - RESTORED full options */}
        {mode === "view" && (
          <Panel position="top-right" className="mt-4 mr-4">
            <div className="glass-panel rounded-2xl p-2 flex flex-col gap-1 shadow-lg min-w-[160px]">
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
                className="glass-panel p-2 rounded-xl shadow-xl backdrop-blur-3xl"
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
      </ReactFlow>
    </div>
  );
}

function ControlButton({ onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-full hover:bg-black/5 text-[#1D1D1F] transition-colors flex items-center gap-2 group active:scale-90"
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
          ? "bg-white shadow-md text-[#0071E3]"
          : "text-[#86868B] hover:bg-black/5 hover:text-[#1D1D1F]"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function SettingsSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-xs text-[#1D1D1F] font-semibold">
      <div className="flex items-center justify-between">
        <span className="uppercase tracking-widest text-[10px] text-[#86868B]">
          {label}
        </span>
        <span className="text-[11px] text-[#1D1D1F]">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-blue-500"
      />
    </label>
  );
}

function SettingsToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-xl border border-black/5 bg-white/70 px-3 py-2 text-xs font-semibold text-[#1D1D1F] hover:bg-white/90 transition"
    >
      <span className="uppercase tracking-widest text-[10px] text-[#86868B]">
        {label}
      </span>
      <span
        className={`inline-flex h-5 w-9 items-center rounded-full transition ${
          checked ? "bg-blue-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}
