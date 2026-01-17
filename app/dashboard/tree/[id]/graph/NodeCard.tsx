import { memo, useState, useCallback, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { MapPin, UserPlus, ArrowUp, ArrowDown, Heart } from "lucide-react";

export const NodeCard = memo(({ data, selected }: NodeProps<any>) => {
  const { label, born_year, died_year, city, accent } = data || {};
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editLabel !== label && data.onRename) {
      data.onRename(data.id, editLabel);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  // Action Helpers
  const onAddParent = (e: React.MouseEvent) => { e.stopPropagation(); data.onAddParent?.(data.id); };
  const onAddChild = (e: React.MouseEvent) => { e.stopPropagation(); data.onAddChild?.(data.id); };
  const onAddPartner = (e: React.MouseEvent) => { e.stopPropagation(); data.onAddPartner?.(data.id); };

  // Determine if we are in "Atlas" mode (zoomed out) or detail mode
  // If data.lod is 'ATLAS', this component might not even be rendered by the parent,
  // but if it is, we stick to the card layout.

  return (
    <div className={`
        relative group w-[260px]
        transition-all duration-300 ease-out
        ${selected ? "z-50" : "z-0 hover:z-40"}
    `}>
      
      {/* --- THE THREE BALLS (Hover Actions) --- */}
      {/* Only show in Editor mode (checked via callback existence) */}
      {data.onAddParent && (
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {/* Top Ball (Parent) */}
            <button 
                onClick={onAddParent}
                className="absolute -top-5 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-blue-600 hover:scale-110 pointer-events-auto transition-transform cursor-pointer z-50"
                title="Add Parent"
            >
                <ArrowUp size={16} />
            </button>

            {/* Bottom Ball (Child) */}
            <button 
                onClick={onAddChild}
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-blue-600 hover:scale-110 pointer-events-auto transition-transform cursor-pointer z-50"
                title="Add Child"
            >
                <ArrowDown size={16} />
            </button>

            {/* Right Ball (Partner) */}
            <button 
                onClick={onAddPartner}
                className="absolute top-1/2 -right-5 -translate-y-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-pink-500 hover:scale-110 pointer-events-auto transition-transform cursor-pointer z-50"
                title="Add Partner"
            >
                <Heart size={14} />
            </button>
        </div>
      )}

      {/* --- MAIN CARD --- */}
      <div 
        onDoubleClick={handleDoubleClick}
        className={`
          rounded-[20px] overflow-hidden 
          backdrop-blur-xl transition-all duration-300
          ${selected 
            ? "bg-white/95 shadow-[0_20px_50px_-12px_rgba(0,113,227,0.25)] ring-2 ring-[#0071E3]" 
            : "bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] ring-1 ring-black/5"
          }
      `}>
        
        {/* Color Strip */}
        <div className="h-1.5 w-full opacity-80" style={{ background: accent || "#0071E3" }} />

        <div className="p-5 flex gap-4 items-center">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div 
              className="w-14 h-14 rounded-[14px] flex items-center justify-center text-xl font-semibold text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${accent || "#0071E3"}, #111)` }}
            >
              {label?.charAt(0) || "?"}
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent border-b-2 border-blue-500 text-[17px] font-semibold text-[#1D1D1F] outline-none p-0 m-0 leading-tight"
                />
            ) : (
                <h3 className="font-semibold text-[17px] leading-tight text-[#1D1D1F] truncate tracking-tight select-none">
                    {label || "Unknown"}
                </h3>
            )}
            
            <div className="flex items-center gap-2 text-[13px] text-[#86868B] font-medium select-none">
               <span>{born_year || "????"}</span>
               <span className="w-1 h-1 rounded-full bg-[#D2D2D7]" />
               <span>{died_year || "Pres."}</span>
            </div>

            {city && (
               <div className="flex items-center gap-1 text-[11px] font-semibold text-[#86868B]/80 uppercase tracking-wide mt-1 select-none">
                  <MapPin size={10} /> {city}
               </div>
            )}
          </div>
        </div>
      </div>

      {/* React Flow Handles (Invisible) */}
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
});

NodeCard.displayName = "NodeCard";