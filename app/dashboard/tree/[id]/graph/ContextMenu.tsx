import React, { useCallback } from 'react';
import { useReactFlow } from 'reactflow';
import { Edit3, Trash2, UserPlus, X } from 'lucide-react';

type ContextMenuProps = {
  id: string;
  top: number;
  left: number;
  right: number;
  bottom: number;
  onClose: () => void;
  onEdit: (id: string) => void;
  onAddRelative: (id: string) => void;
};

export default function ContextMenu({
  id,
  top,
  left,
  right,
  bottom,
  onClose,
  onEdit,
  onAddRelative,
}: ContextMenuProps) {
  const { getNode, setNodes } = useReactFlow();
  const node = getNode(id);

  // Delete Node (Optimistic UI)
  const deleteNode = useCallback(() => {
    setNodes((nodes) => nodes.filter((n) => n.id !== id));
    onClose();
  }, [id, setNodes, onClose]);

  if (!node) return null;

  return (
    <div
      style={{ top, left }}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-2 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
    >
      <div className="px-4 py-2 border-b border-gray-100 mb-1">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{node.data.label}</p>
      </div>

      <button
        onClick={() => { onEdit(id); onClose(); }}
        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2 transition-colors"
      >
        <Edit3 size={14} className="text-blue-500" />
        Edit Profile
      </button>

      <button
        onClick={() => { onAddRelative(id); onClose(); }}
        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-gray-700 flex items-center gap-2 transition-colors"
      >
        <UserPlus size={14} className="text-green-500" />
        Add Relative
      </button>

      <div className="h-px bg-gray-100 my-1" />

      <button
        onClick={deleteNode}
        className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center gap-2 transition-colors"
      >
        <Trash2 size={14} />
        Delete Person
      </button>
    </div>
  );
}