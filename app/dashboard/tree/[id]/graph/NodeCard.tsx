import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { MapPin } from "lucide-react";

export const NodeCard = memo(({ data, selected }: NodeProps<any>) => {
  const { label, born_year, died_year, city, accent, isDimmed, isHighlighted } = data || {};
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(data.onRename) setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editLabel !== label && data.onRename) {
      data.onRename(data.id, editLabel);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlur();
  };

  // Optimization: If zoomed out far, render less detail?
  // React Flow handles visibility via onlyRenderVisibleElements, 
  // but simpler DOM helps too.

  return (
    <div className={`
        relative group w-[260px]
        transition-opacity duration-500 ease-in-out
        ${isDimmed ? "opacity-20 blur-[1px]" : "opacity-100"}
        ${selected ? "z-50" : "z-0 hover:z-40"}
    `}>
      <div 
        onDoubleClick={handleDoubleClick}
        className={`
          rounded-[20px] overflow-hidden 
          backdrop-blur-md transition-all duration-300
          ${selected 
            ? "bg-white shadow-[0_20px_50px_-12px_rgba(0,113,227,0.4)] ring-2 ring-[#0071E3]" 
            : "bg-white/90 shadow-sm hover:shadow-lg ring-1 ring-black/5"
          }
          ${isHighlighted && !selected ? "ring-2 ring-blue-200 bg-blue-50/50" : ""}
      `}>
        
        <div className="h-1.5 w-full opacity-80" style={{ background: accent || "#0071E3" }} />

        <div className="p-5 flex gap-4 items-center">
          <div className="relative shrink-0">
            <div 
              className="w-14 h-14 rounded-[14px] flex items-center justify-center text-xl font-semibold text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${accent || "#0071E3"}, #333)` }}
            >
              {label?.charAt(0) || "?"}
            </div>
          </div>

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

      {/* Invisible handles for React Flow connectivity */}
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
});

NodeCard.displayName = "NodeCard";