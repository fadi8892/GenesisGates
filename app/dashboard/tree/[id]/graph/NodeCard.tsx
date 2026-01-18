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
  onOpenSidebar?: (id: string) => void;
  ui?: {
    cardRadius?: number;
    cardGlow?: boolean;
  };
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
    onOpenSidebar,
    ui,
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
    isHighlighted && !selected ? "ring-2 ring-blue-200" : "";

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(
    null
  );

  const cardRadius = ui?.cardRadius ?? 22;
  const cardGlow = ui?.cardGlow ?? true;
  const hasContextActions = !!(onOpenSidebar || onAddParent || onAddChild || onAddPartner);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("keydown", onEscape);
    };
  }, [contextMenu]);

  const openContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!hasContextActions) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 190;
    const menuHeight = 160;
    const rawX = event.clientX - rect.left;
    const rawY = event.clientY - rect.top;
    const x = Math.min(rect.width - menuWidth - 8, Math.max(8, rawX));
    const y = Math.min(rect.height - menuHeight - 8, Math.max(8, rawY));
    setContextMenu({ x, y });
  };

  const handleOpenSidebar = () => {
    onOpenSidebar?.(id);
    setContextMenu(null);
  };

  const renderContextMenu = () =>
    contextMenu ? (
      <div
        className="absolute z-50"
        style={{ top: contextMenu.y, left: contextMenu.x }}
      >
        <div className="min-w-[190px] rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/70 shadow-2xl p-2 flex flex-col gap-1 text-sm text-[#1D1D1F]">
          {onOpenSidebar && (
            <button
              onClick={handleOpenSidebar}
              className="text-left px-3 py-2 rounded-xl hover:bg-black/5 transition"
            >
              Open details
            </button>
          )}
          {mode === "editor" && onAddParent && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onAddParent(id);
                setContextMenu(null);
              }}
              className="text-left px-3 py-2 rounded-xl hover:bg-black/5 transition"
            >
              Add parent
            </button>
          )}
          {mode === "editor" && onAddChild && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onAddChild(id);
                setContextMenu(null);
              }}
              className="text-left px-3 py-2 rounded-xl hover:bg-black/5 transition"
            >
              Add child
            </button>
          )}
          {mode === "editor" && onAddPartner && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onAddPartner(id);
                setContextMenu(null);
              }}
              className="text-left px-3 py-2 rounded-xl hover:bg-black/5 transition"
            >
              Add partner
            </button>
          )}
        </div>
      </div>
    ) : null;

  // 1) TINY (DOT)
  if (lod === "tiny") {
    return (
      <div
        onContextMenu={openContextMenu}
        className={`relative flex items-center justify-center ${dimClass}`}
      >
        <div
          className={`
            w-3 h-3 rounded-full shadow-sm
            transition-transform duration-500
            ${selected ? "ring-2 ring-[#0071E3] scale-110" : "ring-1 ring-black/10"}
            ${highlightRing}
          `}
          style={{ backgroundColor: safeAccent }}
        />
        <Handle type="target" position={Position.Top} className="!opacity-0" />
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        {renderContextMenu()}
      </div>
    );
  }

  // 2) LOW (LABEL)
  if (lod === "low") {
    return (
      <div
        onContextMenu={openContextMenu}
        className={`
          w-[180px] h-[40px] rounded-full
          bg-white/80 shadow-sm border border-white/40
          flex items-center px-4 gap-2 backdrop-blur-md
          transition-all duration-300 hover:scale-[1.04] cursor-pointer
          ${dimClass}
          ${selected ? "ring-2 ring-[#0071E3]" : ""}
          ${highlightRing}
        `}
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: safeAccent }} />
        <span className="text-xs font-bold text-gray-700 truncate">
          {label || "Unknown"}
        </span>

        <Handle type="target" position={Position.Top} className="!opacity-0" />
        <Handle type="source" position={Position.Bottom} className="!opacity-0" />
        {renderContextMenu()}
      </div>
    );
  }

  // 3) HIGH (FULL CARD)
  return (
    <div
      onContextMenu={openContextMenu}
      className={`
        relative group w-[260px] h-[160px]
        transition-all duration-300 ease-out
        transition-opacity duration-500 ease-in-out
        hover:-translate-y-1
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
        className={`relative w-full h-full p-[1px] transition-all duration-300 ${
          cardGlow ? "drop-shadow-[0_20px_45px_rgba(15,23,42,0.18)]" : ""
        }`}
        style={{
          borderRadius: cardRadius + 4,
          background: `linear-gradient(135deg, ${safeAccent}22, rgba(255,255,255,0.8), ${safeAccent}44)`,
        }}
      >
        <div
          onDoubleClick={handleDoubleClick}
          className={`
            w-full h-full overflow-hidden backdrop-blur-2xl transition-all duration-300
            ${
              selected
                ? "bg-white/95 shadow-xl ring-2 ring-[#0071E3]"
                : "bg-white/80 shadow-md hover:shadow-2xl ring-1 ring-black/5"
            }
            ${highlightRing}
          `}
          style={{ borderRadius: cardRadius }}
        >
          <div className="h-1.5 w-full opacity-80" style={{ background: safeAccent }} />

          <div className="p-5 flex gap-4 items-center h-full">
            <div className="relative shrink-0 self-start mt-2">
              <div
                className="w-14 h-14 rounded-[16px] flex items-center justify-center text-xl font-semibold text-white shadow-lg select-none"
                style={{ background: `linear-gradient(135deg, ${safeAccent}, #0F172A)` }}
              >
                {(label?.charAt(0) || "?").toUpperCase()}
              </div>
            </div>

            <div className="min-w-0 flex-1 flex flex-col gap-1 self-start mt-2">
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onBlur={commit}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-b-2 border-blue-500 text-[17px] font-semibold text-[#1D1D1F] outline-none"
                />
              ) : (
                <h3 className="font-semibold text-[17px] text-[#1D1D1F] truncate select-none">
                  {label || "Unknown"}
                </h3>
              )}

              <div className="flex items-center gap-2 text-[13px] text-[#86868B] font-medium select-none">
                <span>{born_year || "????"}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D2D2D7]" />
                <span>{died_year || "Pres."}</span>
              </div>

              {city && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#86868B]/80 uppercase tracking-wide mt-2 select-none">
                  <MapPin size={10} /> {city}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {renderContextMenu()}

      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
});

NodeCard.displayName = "NodeCard";
