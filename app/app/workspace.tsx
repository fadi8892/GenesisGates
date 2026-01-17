"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeProps,
  useEdgesState,
  useNodesState,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser } from "@/lib/supabase/browser";
import dagre from "dagre";
import { toPng } from "html-to-image";
import {
  LogOut,
  Plus,
  Share2,
  Sparkles,
  X,
  Crown,
  Search,
  GitBranch,
  Download,
  Maximize,
  Minus,
  LayoutTemplate,
  MapPin,
  Users
} from "lucide-react";

// --- TYPES ---
type Tier = "free" | "pro" | "admin";

type MemberData = {
  label: string;
  bio?: string | null;
  born_year?: number | null;
  died_year?: number | null;
  lat?: number | null;
  lng?: number | null;
  tags?: string[];
  accent?: string;
};

// Register custom nodes
const nodeTypes = {
  person: PersonNode,
};

// --- HELPERS ---
function useDebounced<T extends (...args: any[]) => void>(fn: T, ms: number) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: Parameters<T>) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), ms);
  };
}

function autoAccent(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = seed.charCodeAt(i) + ((h << 5) - h);
  }
  const c = (h & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "000000".substring(0, 6 - c.length) + c;
}

// --- MAIN COMPONENT ---
export default function Workspace() {
  return (
    <ReactFlowProvider>
      <WorkspaceInner />
    </ReactFlowProvider>
  );
}

function WorkspaceInner() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  
  // State
  const [tier, setTier] = useState<Tier>("free");
  const [treeId, setTreeId] = useState<string | null>(null);
  const [treeName, setTreeName] = useState("My Genesis Vault");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<MemberData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selected, setSelected] = useState<Node<MemberData> | null>(null);

  const NODE_LIMIT = tier === "free" ? 25 : 500;

  // --- INITIAL LOAD ---
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        window.location.href = "/";
        return;
      }

      // Load Tier
      const prof = await supabase.from("profiles").select("tier").eq("user_id", u.user.id).maybeSingle();
      setTier((prof.data?.tier as Tier) || "free");

      // Get/Create Tree
      let treeRes = await supabase.from("trees").select("id,name").eq("owner_id", u.user.id).maybeSingle();
      if (!treeRes.data) {
        const created = await supabase.from("trees").insert({ owner_id: u.user.id, name: "My Genesis Vault" }).select().single();
        if (created.error) return alert(created.error.message);
        treeRes = created;
      }

      setTreeId(treeRes.data!.id);
      setTreeName(treeRes.data!.name);
      await loadTree(treeRes.data!.id);
    })();
  }, [supabase]);

  async function loadTree(tid: string) {
    setIsSyncing(true);
    const [mem, ed] = await Promise.all([
      supabase.from("members").select("*").eq("tree_id", tid),
      supabase.from("edges").select("*").eq("tree_id", tid)
    ]);

    const loadedNodes: Node<MemberData>[] = (mem.data || []).map((m: any) => ({
      id: m.id,
      position: { x: m.pos_x ?? 0, y: m.pos_y ?? 0 },
      type: "person",
      data: {
        label: m.label ?? "Person",
        bio: m.bio,
        born_year: m.born_year,
        died_year: m.died_year,
        lat: m.lat,
        lng: m.lng,
        tags: m.tags ?? [],
        accent: m.style?.accent || autoAccent(m.id),
      },
    }));

    const loadedEdges: Edge[] = (ed.data || []).map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep', // Upgrade to nicer lines
      animated: true,
      style: { stroke: '#555', strokeWidth: 2 },
      data: { kind: e.kind },
    }));

    setNodes(loadedNodes);
    setEdges(loadedEdges);
    setIsSyncing(false);
    setTimeout(() => fitView({ duration: 800 }), 100);
  }

  // --- SAVING LOGIC (Preserved) ---
  const saveNodeDebounced = useDebounced(async (node: Node<MemberData>) => {
    if (!treeId) return;
    setIsSyncing(true);
    const payload = {
      id: node.id,
      tree_id: treeId,
      label: node.data.label,
      bio: node.data.bio,
      born_year: node.data.born_year,
      died_year: node.data.died_year,
      lat: node.data.lat,
      lng: node.data.lng,
      tags: node.data.tags,
      pos_x: node.position.x,
      pos_y: node.position.y,
      style: { accent: node.data.accent },
    };
    await supabase.from("members").upsert(payload);
    setIsSyncing(false);
  }, 650);

  // --- ACTIONS ---
  async function addPerson() {
    if (!treeId) return;
    if (nodes.length >= NODE_LIMIT) return alert("Limit reached.");

    const id = crypto.randomUUID();
    const accent = autoAccent(id);
    
    // Add slightly offset from center or random
    const newNode: Node<MemberData> = {
      id,
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      type: "person",
      data: { label: "New Member", accent, tags: [] },
    };

    setNodes((prev) => [...prev, newNode]);
    setIsSyncing(true);

    const { error } = await supabase.from("members").insert({
      id,
      tree_id: treeId,
      label: newNode.data.label,
      pos_x: newNode.position.x,
      pos_y: newNode.position.y,
      style: { accent },
    });

    setIsSyncing(false);
    if (error) {
      alert(error.message);
      setNodes((prev) => prev.filter((n) => n.id !== id));
    }
  }

  const onConnect = useCallback(async (conn: Connection) => {
    if (!treeId || !conn.source || !conn.target) return;
    const id = `e-${conn.source}-${conn.target}`;
    
    setEdges((eds) => addEdge({ 
      ...conn, 
      id, 
      type: 'smoothstep', 
      animated: true, 
      style: { stroke: '#6366f1', strokeWidth: 2 } 
    }, eds));

    await supabase.from("edges").upsert({
      id,
      tree_id: treeId,
      source: conn.source,
      target: conn.target,
      kind: "link",
    });
  }, [treeId, setEdges, supabase]);

  // --- NEW FEATURES ---

  // 1. Auto Layout Engine
  const onLayout = useCallback((direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction });

    const nodeWidth = 260;
    const nodeHeight = 140;

    nodes.forEach((node) => dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight }));
    edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

    dagre.layout(dagreGraph);

    const layoutNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const newNode = {
        ...node,
        position: {
          x: nodeWithPosition.x - nodeWidth / 2,
          y: nodeWithPosition.y - nodeHeight / 2,
        },
      };
      // Trigger save for new position
      saveNodeDebounced(newNode);
      return newNode;
    });

    setNodes(layoutNodes);
    setTimeout(() => fitView({ duration: 800 }), 10);
  }, [nodes, edges, setNodes, fitView, saveNodeDebounced]);

  // 2. Spotlight Search
  const handleSearch = (term: string) => {
    if (!term) return;
    const target = nodes.find(n => n.data.label.toLowerCase().includes(term.toLowerCase()));
    if (target) {
      setCenter(target.position.x + 130, target.position.y + 70, { zoom: 1.5, duration: 1000 });
      setSelected(target);
    }
  };

  // 3. Export
  const handleExport = () => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if(viewport) {
      toPng(viewport, { backgroundColor: '#000' }).then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `genesis-tree-${treeId}.png`;
        link.href = dataUrl;
        link.click();
      });
    }
  };

  // --- RENDER ---
  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden flex flex-col font-sans">
      <TopBar treeName={treeName} tier={tier} syncing={isSyncing} onAdd={addPerson} onLogout={() => supabase.auth.signOut().then(() => window.location.href = "/")} />

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => {
             onNodesChange(changes);
             changes.forEach((c: any) => {
               if (c.type === "position" && c.dragging === false) {
                 const moved = nodes.find((n) => n.id === c.id);
                 if (moved) saveNodeDebounced({ ...moved, position: c.position ?? moved.position });
               }
             });
          }}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelected(n as Node<MemberData>)}
          fitView
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { stroke: '#444' } }}
        >
          <Background gap={40} size={1} color="#222" />
          
          {/* --- DYNAMIC ISLAND (Floating Controls) --- */}
          <Panel position="bottom-center" className="mb-10">
            <motion.div 
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               className="flex items-center gap-1 p-2 bg-[#121212]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
            >
               <button onClick={() => setShowSearch(!showSearch)} className="p-3 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors"><Search className="w-5 h-5" /></button>
               <div className="w-px h-6 bg-white/10 mx-1" />
               <button onClick={() => onLayout('TB')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold transition-colors text-xs uppercase tracking-wider">
                  <GitBranch className="w-4 h-4" /> Auto
               </button>
               <button onClick={() => onLayout('LR')} className="p-3 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors" title="Horizontal"><LayoutTemplate className="w-4 h-4 rotate-90" /></button>
               <div className="w-px h-6 bg-white/10 mx-1" />
               <button onClick={() => zoomOut()} className="p-3 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors"><Minus className="w-4 h-4" /></button>
               <button onClick={() => zoomIn()} className="p-3 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors"><Plus className="w-4 h-4" /></button>
               <button onClick={() => fitView()} className="p-3 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors"><Maximize className="w-4 h-4" /></button>
               <div className="w-px h-6 bg-white/10 mx-1" />
               <button onClick={handleExport} className="p-3 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
            </motion.div>
          </Panel>

           {/* --- SEARCH OVERLAY --- */}
          <AnimatePresence>
            {showSearch && (
               <Panel position="top-center" className="mt-8">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-[400px] bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl overflow-hidden p-2 flex items-center gap-3"
                  >
                    <Search className="w-5 h-5 text-white/40 ml-2" />
                    <input 
                      autoFocus
                      placeholder="Find ancestor..." 
                      className="bg-transparent border-none outline-none text-white h-10 w-full text-base placeholder:text-white/20"
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    <button onClick={() => setShowSearch(false)} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] text-white/50 font-bold uppercase">ESC</button>
                  </motion.div>
               </Panel>
            )}
          </AnimatePresence>
        </ReactFlow>

        <AnimatePresence>
          {selected && (
            <Inspector
              node={selected}
              onClose={() => setSelected(null)}
              onChange={(patch) => {
                setNodes((prev) => prev.map((n) => n.id === selected.id ? { ...n, data: { ...n.data, ...patch } } : n));
                const updated: Node<MemberData> = { ...selected, data: { ...selected.data, ...patch } };
                setSelected(updated);
                saveNodeDebounced(updated);
              }}
            />
          )}
        </AnimatePresence>

        {nodes.length === 0 && <EmptyState onAdd={addPerson} tier={tier} />}
      </div>
    </div>
  );
}

// --- COMPONENTS ---

function TopBar({ treeName, tier, syncing, onAdd, onLogout }: any) {
  return (
    <div className="h-16 w-full px-6 flex items-center justify-between border-b border-white/5 bg-[#050505]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
          <Sparkles size={16} />
        </div>
        <div>
          <div className="font-bold text-sm tracking-wide text-white">{treeName}</div>
          <div className="text-[10px] uppercase tracking-wider text-white/40 flex items-center gap-2">
            <span>Workspace</span>
            <span className={`w-1.5 h-1.5 rounded-full ${syncing ? "bg-yellow-500 animate-pulse" : "bg-emerald-500"}`} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onAdd} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white text-black rounded-lg text-xs font-bold hover:bg-gray-200 transition">
           <Plus size={14} /> New Person
        </button>
        <button onClick={onLogout} className="px-3 py-1.5 rounded-lg hover:bg-white/5 text-xs text-white/50 font-medium transition">
           Log out
        </button>
      </div>
    </div>
  );
}

function PersonNode({ data, selected }: NodeProps<MemberData>) {
  // Use user's existing data, but upgrade visual wrapper
  const accent = data.accent || "#3b82f6";
  return (
    <div className={`
        relative group w-[260px] transition-all duration-300
        ${selected ? 'scale-105 z-50' : 'scale-100 z-0'}
    `}>
      <div className={`
        rounded-2xl backdrop-blur-xl border transition-all duration-300 overflow-hidden
        ${selected 
            ? 'bg-zinc-900/90 border-indigo-500 shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]' 
            : 'bg-[#0a0a0a]/80 border-white/10 hover:border-white/20 shadow-xl'
        }
      `}>
        {/* Color Strip */}
        <div className="h-1 w-full" style={{ background: accent }} />
        
        <div className="p-4 flex gap-4 items-center">
            {/* Initial Avatar (Since we don't have photos in DB yet, use stylish initials) */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border border-white/10 shadow-inner" style={{ background: `${accent}20`, color: accent }}>
               {data.label.charAt(0)}
            </div>
            
            <div className="min-w-0 flex-1">
                <h3 className="font-bold text-base text-white truncate leading-tight">{data.label}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-xs text-white/40 font-mono">
                      {formatYears(data.born_year, data.died_year)}
                   </span>
                </div>
            </div>
        </div>

        {/* Footer (Lat/Lng or Bio hint) */}
        {(data.lat || data.bio) && (
            <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex items-center gap-2 text-[10px] text-white/30">
               {data.lat ? <><MapPin size={10} /> Location Set</> : <span className="truncate max-w-full">{data.bio}</span>}
            </div>
        )}
      </div>
      
      {/* Invisible Handles so ReactFlow works */}
      {/* Top Handle */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-transparent" /> 
      {/* Bottom Handle */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-transparent" />
    </div>
  );
}

function EmptyState({ onAdd, tier }: { onAdd: () => void; tier: Tier }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto text-center">
        <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10">
            <Sparkles className="w-8 h-8 text-white/20" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Build your legacy</h2>
        <p className="text-white/40 max-w-sm mx-auto mb-8">Start by adding the first ancestor to your infinite canvas.</p>
        <button onClick={onAdd} className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
          Create First Person
        </button>
      </div>
    </div>
  );
}

// Keep Inspector + Fields exactly as is to ensure data integrity
function Inspector({ node, onClose, onChange }: { node: Node<MemberData>; onClose: () => void; onChange: (patch: Partial<MemberData>) => void; }) {
  return (
    <motion.div initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }} transition={{ type: "spring", damping: 24, stiffness: 220 }} className="absolute top-16 right-4 h-[calc(100vh-80px)] w-[360px] border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden z-50">
      <div className="h-14 px-5 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
        <div className="text-xs font-bold uppercase tracking-widest text-white/50">Details</div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition"><X size={16} /></button>
      </div>
      <div className="p-5 space-y-6 overflow-y-auto h-[calc(100%-56px)]">
        {/* Name Field */}
        <div className="space-y-1">
            <label className="text-xs font-bold text-white/40 uppercase">Full Name</label>
            <input className="w-full bg-transparent border-b border-white/10 py-2 text-lg font-bold text-white outline-none focus:border-indigo-500 transition-colors" value={node.data.label} onChange={(e) => onChange({ label: e.target.value })} />
        </div>
        
        {/* Years Grid */}
        <div className="grid grid-cols-2 gap-4">
            <Field label="Born"><input type="number" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={node.data.born_year ?? ""} onChange={(e) => onChange({ born_year: e.target.value ? Number(e.target.value) : null })} /></Field>
            <Field label="Died"><input type="number" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={node.data.died_year ?? ""} onChange={(e) => onChange({ died_year: e.target.value ? Number(e.target.value) : null })} /></Field>
        </div>

        <Field label="Biography">
          <textarea className="w-full h-32 bg-white/5 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-indigo-500 leading-relaxed" value={node.data.bio ?? ""} onChange={(e) => onChange({ bio: e.target.value })} placeholder="Tell their story..." />
        </Field>

        <div className="pt-4 border-t border-white/10">
          <button onClick={() => { navigator.clipboard.writeText(node.id); alert("Copied ID"); }} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white/60 flex items-center justify-center gap-2"><Share2 size={12} /> Copy Node ID</button>
        </div>
      </div>
    </motion.div>
  );
}

function Field({ label, children }: any) {
  return <div><div className="text-xs text-white/40 font-bold uppercase mb-1.5">{label}</div>{children}</div>;
}

function formatYears(b?: number | null, d?: number | null) {
  if (!b && !d) return "No dates";
  return `${b || '?'} — ${d || 'Present'}`;
}