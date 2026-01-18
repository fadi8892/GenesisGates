"use client";

import React, { useState } from "react";
import { 
  ArrowLeft, Calendar, MapPin, Share2, 
  Printer, Edit3, User, Heart, 
  Baby, ScrollText, Users, Network, ExternalLink, RefreshCw
} from "lucide-react";
import type { GraphData } from "./graph/types";

// --- HELPERS ---
const getPerson = (data: GraphData, id: string) => data.nodes.find(n => n.id === id);
const getRelatives = (data: GraphData, id: string) => {
    const parents: any[] = [];
    const children: any[] = [];
    
    data.edges.forEach(e => {
        if (e.target === id) parents.push(getPerson(data, e.source));
        if (e.source === id) children.push(getPerson(data, e.target));
    });
    return { parents, children };
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
  const [activeTab, setActiveTab] = useState('LifeStory');
  const person = getPerson(data, personId);
  const relatives = getRelatives(data, personId);
  if (!person) return null;

  const d = person.data || {};

  const events = [
    { year: d.born_year || '????', title: "Birth", desc: d.birthPlace || "Unknown Location", icon: Baby },
    ...(d.events || []), 
    { year: d.died_year || 'Present', title: d.died_year ? "Death" : "Living", desc: d.deathPlace || "", icon: Heart },
  ];

  return (
    <div className="h-full w-full bg-gray-50 text-gray-900 overflow-y-auto custom-scrollbar flex flex-col">
      
      {/* --- HERO HEADER --- */}
      <div className="relative h-64 bg-gradient-to-b from-white to-gray-100 border-b border-gray-200 flex-shrink-0">
         <div className="absolute top-4 left-4 z-10">
             <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white border border-gray-200 shadow-sm rounded-full text-xs font-bold text-gray-700 transition-colors backdrop-blur">
                <ArrowLeft size={14} /> Back
             </button>
         </div>
         
         <div className="w-full h-full flex flex-col items-center justify-end pb-6 px-6 text-center">
             <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl bg-gray-200 overflow-hidden mb-4">
                 {d.photos && d.photos[0] ? (
                    <img src={d.photos[0]} className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                        <User size={40} />
                    </div>
                 )}
             </div>
             
             <h1 className="text-2xl font-bold text-gray-900 leading-tight">{resolveName(person)}</h1>
             <div className="flex items-center gap-3 text-gray-500 text-xs font-medium mt-2">
                <span className="flex items-center gap-1"><Calendar size={12} /> {d.born_year || '?'} — {d.died_year || 'Pres.'}</span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {d.birthPlace || 'Unknown'}</span>
             </div>
         </div>
      </div>

      {/* --- TABS --- */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
         {['LifeStory', 'Family', 'WikiTree'].map((tab) => (
             <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    activeTab === tab 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
             >
                {tab}
             </button>
         ))}
      </div>

      {/* --- CONTENT --- */}
      <div className="p-6">
         
         {/* TAB: LIFESTORY */}
         {activeTab === 'LifeStory' && (
             <div className="space-y-6">
                 <div className="relative border-l-2 border-gray-200 ml-2 space-y-6 pb-2">
                     {events.map((ev, i) => (
                         <div key={i} className="relative pl-6 group">
                             <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-gray-300 group-hover:border-blue-500 group-hover:bg-blue-50 transition-colors flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-blue-500" />
                             </div>
                             <div>
                                 <span className="text-xs font-bold text-gray-400 block mb-0.5">{ev.year}</span>
                                 <div className="font-bold text-sm text-gray-900">{ev.title}</div>
                                 <div className="text-xs text-gray-500">{ev.desc}</div>
                             </div>
                         </div>
                     ))}
                 </div>
                 <button className="w-full py-3 rounded-xl border border-dashed border-gray-300 text-gray-400 text-xs font-bold hover:bg-white hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2">
                    <Edit3 size={14} /> Add Life Event
                 </button>
             </div>
         )}

         {/* TAB: FAMILY */}
         {activeTab === 'Family' && (
             <div className="space-y-6">
                 <div>
                     <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Parents</div>
                     {relatives.parents.length > 0 ? relatives.parents.map(p => p && (
                         <div key={p.id} onClick={() => onSelect(p.id)} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm mb-2 hover:border-blue-200 cursor-pointer transition-colors">
                             <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{p.data.label.charAt(0)}</div>
                             <div className="flex-1">
                                 <div className="font-bold text-sm text-gray-900">{resolveName(p)}</div>
                                 <div className="text-xs text-gray-500">{p.data.born_year || '?'}</div>
                             </div>
                         </div>
                     )) : <div className="text-xs text-gray-400 italic pl-2">No parents listed.</div>}
                 </div>

                 <div>
                     <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Children</div>
                     {relatives.children.length > 0 ? relatives.children.map(c => c && (
                         <div key={c.id} onClick={() => onSelect(c.id)} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm mb-2 hover:border-blue-200 cursor-pointer transition-colors">
                             <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{c.data.label.charAt(0)}</div>
                             <div className="flex-1">
                                 <div className="font-bold text-sm text-gray-900">{resolveName(c)}</div>
                                 <div className="text-xs text-gray-500">{c.data.born_year || '?'}</div>
                             </div>
                         </div>
                     )) : <div className="text-xs text-gray-400 italic pl-2">No children listed.</div>}
                 </div>
             </div>
         )}

         {/* TAB: WIKITREE (NEW) */}
         {activeTab === 'WikiTree' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                 
                 {/* Source Header */}
                 <div className="bg-[#f2f8ea] border border-[#bcdba3] rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-white p-1.5 rounded-md border border-[#bcdba3]">
                            <Network className="w-5 h-5 text-[#6c8f48]" /> 
                        </div>
                        <h3 className="font-bold text-[#2e4d1b] text-sm">WikiTree Connection</h3>
                    </div>
                    <p className="text-xs text-[#4a6b32] leading-relaxed">
                        We found possible matches for <strong>{resolveName(person)}</strong> in the global family tree. Syncing allows you to import missing dates and relatives.
                    </p>
                 </div>

                 {/* Simulated Match */}
                 <div className="mb-4">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Best Match</div>
                    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <div className="font-bold text-gray-900">{resolveName(person)}</div>
                                <div className="text-xs text-gray-500 font-mono">ID: {person.data.label.split(' ')[1] || 'Smith'}-429</div>
                            </div>
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">98% Match</span>
                        </div>
                        
                        <div className="space-y-2 text-xs text-gray-600 mb-4">
                            <div className="flex justify-between border-b border-gray-50 pb-1">
                                <span>Birth</span>
                                <span className="font-medium text-gray-900">{d.born_year || '1920'} <span className="text-green-600">(Match)</span></span>
                            </div>
                            <div className="flex justify-between border-b border-gray-50 pb-1">
                                <span>Death</span>
                                <span className="font-medium text-gray-900">{d.died_year || '1995'} <span className="text-green-600">(Match)</span></span>
                            </div>
                            <div className="flex justify-between">
                                <span>Mother</span>
                                <span className="font-medium text-blue-600">Sarah Jones <span className="text-gray-400 font-normal">(New)</span></span>
                            </div>
                        </div>

                        <button className="w-full py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                            <RefreshCw size={12} /> Sync Data to Tree
                        </button>
                    </div>
                 </div>

                 <button className="w-full py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <ExternalLink size={12} /> View Full Record on WikiTree
                 </button>

             </div>
         )}

      </div>
    </div>
  );
}