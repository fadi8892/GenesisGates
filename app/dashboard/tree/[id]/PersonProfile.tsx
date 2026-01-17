"use client";

import React from "react";
import { 
  ArrowLeft, Calendar, MapPin, Share2, 
  Printer, Edit3, User, Heart, 
  Baby, ScrollText, Users
} from "lucide-react";
import type { GraphData } from "./graph/types";

// --- HELPERS ---
const getPerson = (data: GraphData, id: string) => data.nodes.find(n => n.id === id);
const getRelatives = (data: GraphData, id: string) => {
    const parents: any[] = [];
    const children: any[] = [];
    const spouses: any[] = [];

    data.edges.forEach(e => {
        if (e.target === id) parents.push(getPerson(data, e.source));
        if (e.source === id) children.push(getPerson(data, e.target));
        // Simple spouse logic: if share children or explicit link (simplified)
    });
    return { parents, children, spouses };
};

const resolveName = (n: any) => {
    if(!n) return "Unknown";
    return n.data?.label || n.data?.displayName || n.data?.name || "Unnamed";
};

export default function PersonProfile({ data, personId, onBack, onSelect }: { 
  data: GraphData; 
  personId: string; 
  onBack: () => void;
  onSelect: (id: string) => void;
}) {
  const person = getPerson(data, personId);
  const relatives = getRelatives(data, personId);
  if (!person) return null;

  const d = person.data || {};
  const accent = d.accent || "#3b82f6";

  // Mock timeline events based on basic data
  const events = [
    { year: d.born_year || '????', title: "Birth", desc: d.birthPlace || "Unknown Location", icon: Baby },
    // You can add more events from your JSONB data here
    ...(d.events || []), 
    { year: d.died_year || 'Present', title: d.died_year ? "Death" : "Living", desc: d.deathPlace || "", icon: Heart },
  ];

  return (
    <div className="h-full w-full bg-gray-50 text-gray-900 overflow-y-auto custom-scrollbar">
      
      {/* --- 1. HERO HEADER --- */}
      <div className="relative h-64 bg-gradient-to-b from-white to-gray-100 border-b border-gray-200">
         <div className="absolute top-4 left-4">
             <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-700 font-medium transition-colors">
                <ArrowLeft size={16} /> Back to Tree
             </button>
         </div>
         
         <div className="container mx-auto max-w-5xl h-full flex items-end px-8 pb-8 gap-8">
             {/* Portrait */}
             <div className="w-40 h-40 rounded-full border-4 border-gray-200 bg-gray-100 shadow-xl flex items-center justify-center overflow-hidden shrink-0 relative -bottom-12">
                 {d.photos && d.photos[0] ? (
                    <img src={d.photos[0]} className="w-full h-full object-cover" />
                 ) : (
                    <User size={64} className="text-gray-300" />
                 )}
             </div>
             
             {/* Info */}
             <div className="mb-2 flex-1">
                 <h1 className="text-4xl font-bold text-gray-900 mb-2">{resolveName(person)}</h1>
                 <div className="flex items-center gap-4 text-gray-500 text-sm font-mono">
                    <span className="flex items-center gap-1"><Calendar size={14} /> {d.born_year || '?'} — {d.died_year || 'Present'}</span>
                    <span className="flex items-center gap-1"><MapPin size={14} /> {d.birthPlace || 'Location not set'}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs uppercase tracking-wider">Great-Grandfather</span>
                 </div>
             </div>

             {/* Actions */}
             <div className="flex gap-2 mb-4">
                 <button className="p-3 bg-accent hover:bg-accent-hover text-white rounded-full shadow-lg transition-transform hover:scale-105"><Edit3 size={18} /></button>
                 <button className="p-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors"><Printer size={18} /></button>
                 <button className="p-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors"><Share2 size={18} /></button>
             </div>
         </div>
      </div>

      {/* --- 2. MAIN CONTENT --- */}
      <div className="container mx-auto max-w-5xl mt-16 px-8 grid grid-cols-12 gap-12 pb-20">
         
         {/* LEFT COL: FACTS & SOURCES (8 cols) */}
         <div className="col-span-8 space-y-10">
             
             {/* Tabs */}
             <div className="flex border-b border-gray-200 mb-8">
                 {['LifeStory', 'Facts', 'Gallery', 'Hints'].map((tab, i) => (
                     <button key={tab} className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${i===1 ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        {tab} {i===3 && <span className="ml-1 bg-green-500 text-black text-[10px] px-1.5 rounded-full">6</span>}
                     </button>
                 ))}
             </div>

             {/* Timeline Section */}
             <section>
                 <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><ScrollText size={20} className="text-indigo-400"/> Timeline</h3>
                 <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pb-10">
                     {events.map((ev, i) => (
                         <div key={i} className="relative pl-8 group">
                             {/* Dot */}
                             <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-gray-300 group-hover:border-accent group-hover:bg-accent/20 transition-colors" />
                             
                             <div className="bg-white border border-gray-200 p-4 rounded-xl hover:bg-gray-100 transition-colors">
                                 <div className="flex justify-between items-start mb-1">
                                     <span className="font-bold text-lg text-gray-900">{ev.year}</span>
                                     <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Age {i * 24}</span>
                                 </div>
                                 <div className="font-bold text-accent mb-1">{ev.title}</div>
                                 <div className="text-sm text-gray-500">{ev.desc}</div>
                             </div>
                         </div>
                     ))}
                 </div>
             </section>

             {/* Sources Section */}
             <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ScrollText size={20} className="text-green-500"/> Sources</h3>
                    <button className="text-xs font-bold text-gray-500 hover:text-gray-700 uppercase">+ Add</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {[1910, 1920, 1930, 1940].map(year => (
                        <div key={year} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer transition-colors">
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center font-serif font-bold text-gray-400">Census</div>
                            <div>
                                <div className="font-bold text-sm text-gray-900">{year} US Federal Census</div>
                                <div className="text-xs text-gray-500">Official Record</div>
                            </div>
                        </div>
                    ))}
                </div>
             </section>
         </div>

         {/* RIGHT COL: FAMILY SIDEBAR (4 cols) */}
         <div className="col-span-4 space-y-8">
             <section>
                 <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Users size={20} className="text-orange-500"/> Family</h3>
                 
                 {/* Parents */}
                 <div className="mb-6">
                     <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Parents</div>
                     <div className="space-y-2">
                         {relatives.parents.map(p => p && (
                             <div key={p.id} onClick={() => onSelect(p.id)} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                                 <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center overflow-hidden">
                                     {p.data?.photos?.[0] ? <img src={p.data.photos[0]} className="w-full h-full object-cover"/> : p.data.label.charAt(0)}
                                 </div>
                                 <div>
                                     <div className="font-bold text-sm text-gray-900">{resolveName(p)}</div>
                                     <div className="text-xs text-gray-500">{p.data.born_year || '?'} — {p.data.died_year || '?'}</div>
                                 </div>
                             </div>
                         ))}
                         {relatives.parents.length === 0 && <div className="text-gray-400 text-sm italic">No parents listed</div>}
                     </div>
                 </div>

                 {/* Spouse & Children */}
                 <div>
                     <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Spouse & Children</div>
                     <div className="space-y-2">
                         {relatives.children.map(c => c && (
                             <div key={c.id} onClick={() => onSelect(c.id)} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors ml-4 border-l border-gray-200">
                                 <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-xs overflow-hidden">
                                     {c.data?.photos?.[0] ? <img src={c.data.photos[0]} className="w-full h-full object-cover"/> : c.data.label.charAt(0)}
                                 </div>
                                 <div>
                                     <div className="font-bold text-sm text-gray-900">{resolveName(c)}</div>
                                     <div className="text-xs text-gray-500">{c.data.born_year || '?'}</div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>

             </section>
         </div>
      </div>

    </div>
  );
}