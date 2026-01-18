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
  profile?: MemberProfile;
};

type MemberProfile = {
  preferredName?: string | null;
  middleName?: string | null;
  suffix?: string | null;
  gender?: "male" | "female" | "nonbinary" | "other" | "unknown" | null;
  pronouns?: string | null;
  isLiving?: boolean | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  causeOfDeath?: string | null;
  burialPlace?: string | null;
  residence?: string | null;
  nationality?: string | null;
  ethnicity?: string | null;
  religion?: string | null;
  languages?: string | null;
  occupation?: string | null;
  employer?: string | null;
  education?: string | null;
  militaryService?: string | null;
  relationshipStatus?: string | null;
  spouseName?: string | null;
  childrenCount?: number | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  socialHandle?: string | null;
  notes?: string | null;
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

    const loadedNodes: Node<MemberData>[] = (mem.data || []).map((m: any) => {
      const style = m.style && typeof m.style === "object" ? m.style : {};
      const rawProfile = style?.profile && typeof style.profile === "object" ? style.profile : {};
      const profile = { ...rawProfile, isLiving: rawProfile.isLiving ?? (m.died_year ? false : null) };

      return ({
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
          accent: style?.accent || autoAccent(m.id),
          profile,
        },
      });
    });

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
      style: { accent: node.data.accent, profile: node.data.profile ?? {} },
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
      data: { label: "New Member", accent, tags: [], profile: { isLiving: true } },
    };

    setNodes((prev) => [...prev, newNode]);
    setIsSyncing(true);

    const { error } = await supabase.from("members").insert({
      id,
      tree_id: treeId,
      label: newNode.data.label,
      pos_x: newNode.position.x,
      pos_y: newNode.position.y,
      style: { accent, profile: newNode.data.profile ?? {} },
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
  const [panelTab, setPanelTab] = useState<"view" | "edit">("view");
  const profile = node.data.profile ?? {};

  useEffect(() => {
    setPanelTab("view");
  }, [node.id]);

  const updateProfile = (patch: Partial<MemberProfile>) => {
    onChange({ profile: { ...profile, ...patch } });
  };

  const handleBirthDateChange = (value: string) => {
    updateProfile({ birthDate: value || null });
    const year = value ? Number(value.slice(0, 4)) : null;
    if (value && Number.isFinite(year)) onChange({ born_year: year });
    if (!value) onChange({ born_year: null });
  };

  const handleDeathDateChange = (value: string) => {
    updateProfile({ deathDate: value || null });
    const year = value ? Number(value.slice(0, 4)) : null;
    if (value && Number.isFinite(year)) onChange({ died_year: year });
    if (!value) onChange({ died_year: null });
  };

  const livingStatus =
    profile.isLiving === true
      ? "Living"
      : profile.isLiving === false
      ? "Deceased"
      : node.data.died_year
      ? "Deceased"
      : "Unknown";

  return (
    <motion.div initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }} transition={{ type: "spring", damping: 24, stiffness: 220 }} className="absolute top-16 right-4 h-[calc(100vh-80px)] w-[360px] border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden z-50">
      <div className="h-14 px-5 flex items-center justify-between border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="text-xs font-bold uppercase tracking-widest text-white/50">Details</div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">{livingStatus}</span>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition"><X size={16} /></button>
      </div>
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2 rounded-full bg-white/5 p-1">
          {(["view", "edit"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setPanelTab(tab)}
              className={`flex-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest transition ${
                panelTab === tab ? "bg-white text-black" : "text-white/50 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 space-y-6 overflow-y-auto h-[calc(100%-108px)]">
        {panelTab === "view" ? (
          <>
            <Section title="Identity">
              <DetailRow label="Full name" value={node.data.label} />
              <DetailRow label="Preferred name" value={profile.preferredName} />
              <DetailRow label="Middle name" value={profile.middleName} />
              <DetailRow label="Suffix" value={profile.suffix} />
              <DetailRow label="Gender" value={profile.gender} />
              <DetailRow label="Pronouns" value={profile.pronouns} />
              <DetailRow label="Living status" value={livingStatus} />
            </Section>

            <Section title="Life">
              <DetailRow label="Birth date" value={profile.birthDate} />
              <DetailRow label="Birth place" value={profile.birthPlace} />
              <DetailRow label="Born year" value={node.data.born_year ? String(node.data.born_year) : null} />
              <DetailRow label="Death date" value={profile.deathDate} />
              <DetailRow label="Death place" value={profile.deathPlace} />
              <DetailRow label="Died year" value={node.data.died_year ? String(node.data.died_year) : null} />
              <DetailRow label="Cause of death" value={profile.causeOfDeath} />
              <DetailRow label="Burial place" value={profile.burialPlace} />
            </Section>

            <Section title="Work & Education">
              <DetailRow label="Occupation" value={profile.occupation} />
              <DetailRow label="Employer" value={profile.employer} />
              <DetailRow label="Education" value={profile.education} />
              <DetailRow label="Military service" value={profile.militaryService} />
            </Section>

            <Section title="Family & Social">
              <DetailRow label="Relationship status" value={profile.relationshipStatus} />
              <DetailRow label="Spouse" value={profile.spouseName} />
              <DetailRow label="Children count" value={profile.childrenCount?.toString()} />
              <DetailRow label="Nationality" value={profile.nationality} />
              <DetailRow label="Ethnicity" value={profile.ethnicity} />
              <DetailRow label="Religion" value={profile.religion} />
              <DetailRow label="Languages" value={profile.languages} />
            </Section>

            <Section title="Contact & Location">
              <DetailRow label="Residence" value={profile.residence} />
              <DetailRow label="Email" value={profile.email} />
              <DetailRow label="Phone" value={profile.phone} />
              <DetailRow label="Website" value={profile.website} />
              <DetailRow label="Social" value={profile.socialHandle} />
              <DetailRow label="Coordinates" value={node.data.lat && node.data.lng ? `${node.data.lat}, ${node.data.lng}` : null} />
              <DetailRow label="Tags" value={node.data.tags?.length ? node.data.tags.join(", ") : null} />
            </Section>

            <Section title="Biography">
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{node.data.bio || "No biography added yet."}</p>
            </Section>

            <Section title="Research notes">
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{profile.notes || "No notes yet."}</p>
            </Section>
          </>
        ) : (
          <>
            {/* Name Field */}
            <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase">Full Name</label>
                <input className="w-full bg-transparent border-b border-white/10 py-2 text-lg font-bold text-white outline-none focus:border-indigo-500 transition-colors" value={node.data.label} onChange={(e) => onChange({ label: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Preferred name">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.preferredName ?? ""} onChange={(e) => updateProfile({ preferredName: e.target.value })} />
              </Field>
              <Field label="Middle name">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.middleName ?? ""} onChange={(e) => updateProfile({ middleName: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Suffix">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.suffix ?? ""} onChange={(e) => updateProfile({ suffix: e.target.value })} />
              </Field>
              <Field label="Pronouns">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.pronouns ?? ""} onChange={(e) => updateProfile({ pronouns: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Gender">
                <select className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.gender ?? "unknown"} onChange={(e) => updateProfile({ gender: e.target.value as MemberProfile["gender"] })}>
                  <option value="unknown">Unknown</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="nonbinary">Nonbinary</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Living status">
                <select
                  className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                  value={profile.isLiving === true ? "living" : profile.isLiving === false ? "deceased" : "unknown"}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateProfile({ isLiving: value === "living" ? true : value === "deceased" ? false : null });
                  }}
                >
                  <option value="unknown">Unknown</option>
                  <option value="living">Living</option>
                  <option value="deceased">Deceased</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Birth date">
                <input type="date" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.birthDate ?? ""} onChange={(e) => handleBirthDateChange(e.target.value)} />
              </Field>
              <Field label="Death date">
                <input type="date" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.deathDate ?? ""} onChange={(e) => handleDeathDateChange(e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Born year"><input type="number" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={node.data.born_year ?? ""} onChange={(e) => onChange({ born_year: e.target.value ? Number(e.target.value) : null })} /></Field>
                <Field label="Died year"><input type="number" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={node.data.died_year ?? ""} onChange={(e) => onChange({ died_year: e.target.value ? Number(e.target.value) : null })} /></Field>
            </div>

            <Field label="Birth place">
              <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.birthPlace ?? ""} onChange={(e) => updateProfile({ birthPlace: e.target.value })} />
            </Field>

            <Field label="Death place">
              <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.deathPlace ?? ""} onChange={(e) => updateProfile({ deathPlace: e.target.value })} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Cause of death">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.causeOfDeath ?? ""} onChange={(e) => updateProfile({ causeOfDeath: e.target.value })} />
              </Field>
              <Field label="Burial place">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.burialPlace ?? ""} onChange={(e) => updateProfile({ burialPlace: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Nationality">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.nationality ?? ""} onChange={(e) => updateProfile({ nationality: e.target.value })} />
              </Field>
              <Field label="Ethnicity">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.ethnicity ?? ""} onChange={(e) => updateProfile({ ethnicity: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Religion">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.religion ?? ""} onChange={(e) => updateProfile({ religion: e.target.value })} />
              </Field>
              <Field label="Languages">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.languages ?? ""} onChange={(e) => updateProfile({ languages: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Occupation">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.occupation ?? ""} onChange={(e) => updateProfile({ occupation: e.target.value })} />
              </Field>
              <Field label="Employer">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.employer ?? ""} onChange={(e) => updateProfile({ employer: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Education">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.education ?? ""} onChange={(e) => updateProfile({ education: e.target.value })} />
              </Field>
              <Field label="Military service">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.militaryService ?? ""} onChange={(e) => updateProfile({ militaryService: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Relationship status">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.relationshipStatus ?? ""} onChange={(e) => updateProfile({ relationshipStatus: e.target.value })} />
              </Field>
              <Field label="Spouse name">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.spouseName ?? ""} onChange={(e) => updateProfile({ spouseName: e.target.value })} />
              </Field>
            </div>

            <Field label="Children count">
              <input type="number" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.childrenCount ?? ""} onChange={(e) => updateProfile({ childrenCount: e.target.value ? Number(e.target.value) : null })} />
            </Field>

            <Field label="Residence">
              <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.residence ?? ""} onChange={(e) => updateProfile({ residence: e.target.value })} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Email">
                <input type="email" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.email ?? ""} onChange={(e) => updateProfile({ email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input type="tel" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.phone ?? ""} onChange={(e) => updateProfile({ phone: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Website">
                <input type="url" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.website ?? ""} onChange={(e) => updateProfile({ website: e.target.value })} />
              </Field>
              <Field label="Social handle">
                <input className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={profile.socialHandle ?? ""} onChange={(e) => updateProfile({ socialHandle: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude">
                <input type="number" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={node.data.lat ?? ""} onChange={(e) => onChange({ lat: e.target.value ? Number(e.target.value) : null })} />
              </Field>
              <Field label="Longitude">
                <input type="number" className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={node.data.lng ?? ""} onChange={(e) => onChange({ lng: e.target.value ? Number(e.target.value) : null })} />
              </Field>
            </div>

            <Field label="Tags (comma separated)">
              <input
                className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                value={(node.data.tags ?? []).join(", ")}
                onChange={(e) =>
                  onChange({
                    tags: e.target.value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>

            <Field label="Biography">
              <textarea className="w-full h-32 bg-white/5 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-indigo-500 leading-relaxed" value={node.data.bio ?? ""} onChange={(e) => onChange({ bio: e.target.value })} placeholder="Tell their story..." />
            </Field>

            <Field label="Research notes">
              <textarea className="w-full h-28 bg-white/5 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-indigo-500 leading-relaxed" value={profile.notes ?? ""} onChange={(e) => updateProfile({ notes: e.target.value })} placeholder="Sources, leads, and open questions..." />
            </Field>

            <div className="pt-4 border-t border-white/10">
              <button onClick={() => { navigator.clipboard.writeText(node.id); alert("Copied ID"); }} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white/60 flex items-center justify-center gap-2"><Share2 size={12} /> Copy Node ID</button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function Field({ label, children }: any) {
  return <div><div className="text-xs text-white/40 font-bold uppercase mb-1.5">{label}</div>{children}</div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">{title}</div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-white/40 text-xs uppercase font-semibold tracking-wider">{label}</span>
      <span className="text-white/80 text-sm text-right">{value && value.length ? value : "—"}</span>
    </div>
  );
}

function formatYears(b?: number | null, d?: number | null) {
  if (!b && !d) return "No dates";
  return `${b || '?'} — ${d || 'Present'}`;
}
