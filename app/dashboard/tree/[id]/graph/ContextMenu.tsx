import React from "react";
import {
  Edit3,
  Trash2,
  UserPlus,
  X,
  PlusCircle,
  Home,
  Sparkles,
  Heart,
  ArrowDown,
  ArrowUp,
} from "lucide-react";

const iconClass = "text-blue-500";

type ContextMenuProps = {
  top: number;
  left: number;
  nodeId?: string | null;
  nodeLabel?: string | null;
  canEdit?: boolean;
  onClose: () => void;
  onOpenProfile?: (id: string) => void;
  onAddParent?: (id: string) => void;
  onAddChild?: (id: string) => void;
  onAddPartner?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddRoot?: () => void;
  onResetView?: () => void;
};

export default function ContextMenu({
  top,
  left,
  nodeId,
  nodeLabel,
  canEdit,
  onClose,
  onOpenProfile,
  onAddParent,
  onAddChild,
  onAddPartner,
  onDelete,
  onAddRoot,
  onResetView,
}: ContextMenuProps) {
  const isNodeMenu = !!nodeId;

  return (
    <div
      style={{ top, left }}
      className="absolute z-50 min-w-[220px] overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
            {isNodeMenu ? "Person" : "Map"}
          </p>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {isNodeMenu ? nodeLabel || "Unknown" : "Quick Actions"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-black/5 text-gray-500"
          aria-label="Close menu"
        >
          <X size={14} />
        </button>
      </div>

      {isNodeMenu ? (
        <div className="py-2">
          <MenuButton
            onClick={() => {
              if (nodeId) onOpenProfile?.(nodeId);
              onClose();
            }}
            icon={<Edit3 size={14} className={iconClass} />}
            label="Open profile"
          />

          {canEdit && (
            <>
              <MenuButton
                onClick={() => {
                  if (nodeId) onAddParent?.(nodeId);
                  onClose();
                }}
                icon={<ArrowUp size={14} className="text-indigo-500" />}
                label="Add parent"
              />
              <MenuButton
                onClick={() => {
                  if (nodeId) onAddChild?.(nodeId);
                  onClose();
                }}
                icon={<ArrowDown size={14} className="text-emerald-500" />}
                label="Add child"
              />
              <MenuButton
                onClick={() => {
                  if (nodeId) onAddPartner?.(nodeId);
                  onClose();
                }}
                icon={<Heart size={14} className="text-pink-500" />}
                label="Add partner"
              />
            </>
          )}

          <div className="h-px bg-black/5 my-1" />

          {canEdit && (
            <MenuButton
              danger
              onClick={() => {
                if (nodeId) onDelete?.(nodeId);
                onClose();
              }}
              icon={<Trash2 size={14} />}
              label="Remove person"
            />
          )}
        </div>
      ) : (
        <div className="py-2">
          {canEdit && (
            <MenuButton
              onClick={() => {
                onAddRoot?.();
                onClose();
              }}
              icon={<PlusCircle size={14} className={iconClass} />}
              label="Add new person"
            />
          )}
          <MenuButton
            onClick={() => {
              onResetView?.();
              onClose();
            }}
            icon={<Home size={14} className={iconClass} />}
            label="Return home"
          />
          <MenuButton
            onClick={onClose}
            icon={<Sparkles size={14} className="text-purple-500" />}
            label="Celebrate this map"
          />
        </div>
      )}
    </div>
  );
}

type MenuButtonProps = {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
};

function MenuButton({ onClick, icon, label, danger }: MenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-blue-50"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
