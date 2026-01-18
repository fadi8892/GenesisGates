import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { MapPin, ArrowUp, ArrowDown, Heart } from "lucide-react";

type LodLevel = "tiny" | "low" | "high";
type Mode = "view" | "editor";

type NodeData = {
  id: string;
  label?: string;
  born_year?: string | number;
  died_year?: string | number;
  city?: string;
  accent?: string;

  lod?: LodLevel;
  mode?: Mode;

  // restored features
  isDimmed?: boolean;
  isHighlighted?: boolean;

  onRename?: (id: string, nextLabel: string) => void;
  onAddParent?: (id: string) => void;
  onAddChild?: (id: string) => void;
  onAddPartner?: (id: string) => void;
};

export const NodeCard = memo(({ data, selected }: NodeProps<NodeData>) => {
  const {
    id,
    label,
    born_year,
    died_year,
    city,
    accent,
    lod = "high",
    mode = "view",
    isDimmed,
    isHighlighted,
    onRename,
    onAddParent,
    onAddChild,
    onAddPartner,
  } = data || ({} as NodeData);

  const safeAccent = useMemo(() => accent || "#0071E3", [accent]);

  // --- Editing (restored behavior) ---
  const canRename = !!onRename;
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editLabel if label changes externally
  useEffect(() => {
    if (!isEditing) setEditLabel(label ?? "");
  }, [label, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
    if (!canRename) return;

    const next = (editLabel ?? "").trim();
    const prev = (label ?? "").trim();

    // prevent empty + no-op
    if (!next) {
      setEditLabel(label ?? "");
      return;
    }
    if (next !== prev) onRename?.(id, next);
  };

  const cancel = () => {
    setIsEditing(false);
    setEditLabel(label ?? "");
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // restore: only rename in editor mode, and only in high LOD
    if (mode !== "editor") return;
    if (lod !== "high") return;
    if (!canRename) return;
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  // --- Actions (restored: show if ANY action exists) ---
  const showActions = !!(onAddParent || onAddChild || onAddPartner);

  const clickAddParent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode !== "editor") return;
    onAddParent?.(id);
  };
  const clickAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode !== "editor") return;
    onAddChild?.(id);
  };
  const clickAddPartner = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode !== "editor") return;
    onAddPartner?.(id);
  };

  // Shared dim/highlight wrapper classes (restored)
  const dimClass = isDimmed ? "opacity-20 blur-[1px]" : "opacity-100";
  const highlightRing =
    isHighlighted && !selected ? "ring-2 ring-blue-200/70" : "";

  // 1) TINY (DOT)
  if (lod === "tiny") {
    return (
      <div className={`relative flex items-center justify-center ${dimClass}`}>
        <div
          className={`
            w-3.5 h-3.5 rounded-full shadow-sm
            transition-transform duration-500
            ${selected ? "ring-2 ring-[#0071E3] scale-110" : "ring-1 ring-black/10"}
            ${highlightRing}
          `}
          style={{
            backgroundColor: safeAccent,
            boxShadow: `0 0 14px ${safeAccent}66`,
          }}
        />
        <div
          className="absolute w-6 h-6 rounded-full opacity-60 blur-md"
          style={{ background: `radial-gradient(circle, ${safeAccent}55, transparent 70%)` }}
        />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      </div>
    );
  }

  // 2) LOW (LABEL)
  if (lod === "low") {
    return (
      <div
        className={`
          w-[210px] h-[46px] rounded-full
          bg-white/70 shadow-lg border border-white/70
          flex items-center px-4 gap-3 backdrop-blur-2xl
          transition-all duration-300 hover:scale-[1.04] cursor-pointer
          ${dimClass}
          ${selected ? "ring-2 ring-[#0071E3]" : ""}
          ${highlightRing}
        `}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: safeAccent, boxShadow: `0 0 10px ${safeAccent}66` }}
        />
        <span className="text-xs font-semibold text-gray-700 truncate">
          {label || "Unknown"}
        </span>

        <Handle type="target" position={Position.Top} className="!opacity-0" />
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      </div>
    );
  }

  // 3) HIGH (FULL CARD)
  return (
    <div
      className={`
        relative group w-[300px] h-[200px]
        transition-all duration-300 ease-out
        transition-opacity duration-500 ease-in-out
        ${dimClass}
        ${selected ? "z-50" : "z-0 hover:z-40"}
      `}
    >
      {/* HOVER ACTIONS (Editor only) */}
      {mode === "editor" && showActions && (
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {onAddParent && (
            <button
              onClick={clickAddParent}
              className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:scale-110 hover:border-blue-300 pointer-events-auto transition-all cursor-pointer z-50"
              title="Add Parent"
            >
              <ArrowUp size={16} />
            </button>
          )}

          {onAddChild && (
            <button
              onClick={clickAddChild}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:scale-110 hover:border-blue-300 pointer-events-auto transition-all cursor-pointer z-50"
              title="Add Child"
            >
              <ArrowDown size={16} />
            </button>
          )}

          {onAddPartner && (
            <button
              onClick={clickAddPartner}
              className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-pink-500 hover:scale-110 hover:border-pink-300 pointer-events-auto transition-all cursor-pointer z-50"
              title="Add Partner"
            >
              <Heart size={14} />
            </button>
          )}
        </div>
      )}

      {/* CARD BODY */}
      <div
        onDoubleClick={handleDoubleClick}
        className={`
          w-full h-full rounded-[32px] overflow-hidden backdrop-blur-2xl transition-all duration-300
          ${
            selected
              ? "bg-white/92 shadow-2xl ring-2 ring-[#0071E3]"
              : "bg-white/72 shadow-xl hover:shadow-2xl ring-1 ring-black/5"
          }
          ${highlightRing}
        `}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 20% 0%, ${safeAccent}2f, transparent 60%)`,
          }}
        />
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-60" style={{ background: safeAccent }} />
        <div className="absolute -bottom-14 -left-14 w-32 h-32 rounded-full blur-3xl opacity-40" style={{ background: `${safeAccent}55` }} />
        <div className="h-1 w-full opacity-80 relative" style={{ background: safeAccent }} />

        <div className="relative p-5 flex flex-col gap-4 h-full">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div
                className="absolute inset-0 rounded-[22px] blur-xl opacity-40"
                style={{ background: safeAccent }}
              />
              <div
                className="relative w-16 h-16 rounded-[22px] flex items-center justify-center text-xl font-semibold text-white shadow-xl select-none"
                style={{ background: `linear-gradient(135deg, ${safeAccent}, #0F172A)` }}
              >
                {(label?.charAt(0) || "?").toUpperCase()}
              </div>
            </div>

            <div className="min-w-0 flex-1 flex flex-col gap-1">
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={commit}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-b-2 border-blue-500 text-[19px] font-semibold text-[#1D1D1F] outline-none"
                />
              ) : (
                <h3 className="font-semibold text-[19px] text-[#1D1D1F] truncate select-none">
                  {label || "Unknown"}
                </h3>
              )}

              <div className="flex items-center gap-2 text-[12px] text-[#86868B] font-medium select-none">
                <span>{born_year || "????"}</span>
                <span className="w-1 h-1 rounded-full bg-[#D2D2D7]" />
                <span>{died_year || "Pres."}</span>
              </div>
            </div>
          </div>

          <div className="relative mt-auto flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-white/80 border border-white/70 text-[11px] font-semibold text-[#1D1D1F]/80">
              {born_year || "Birth Unknown"}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/80 border border-white/70 text-[11px] font-semibold text-[#1D1D1F]/80">
              {died_year || "Living"}
            </span>
            {city && (
              <span className="px-3 py-1 rounded-full bg-white/80 border border-white/70 text-[11px] font-semibold text-[#1D1D1F]/80 flex items-center gap-1">
                <MapPin size={10} /> {city}
              </span>
            )}
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
});

NodeCard.displayName = "NodeCard";
