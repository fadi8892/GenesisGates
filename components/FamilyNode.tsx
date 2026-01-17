// components/graph/FamilyNode.tsx
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User, MapPin, Crown } from 'lucide-react';
import { FamilyMemberData } from '@/types/family';
import { cn } from '@/lib/utils'; // Assuming you have a class merger, if not replace with template literals

const FamilyNode = ({ data, selected }: NodeProps<FamilyMemberData>) => {
  // Use the first photo if available, otherwise fallback
  const avatarUrl = data.photos && data.photos.length > 0 ? data.photos[0] : null;

  return (
    <div 
      className={cn(
        "relative group w-[220px] transition-all duration-300 ease-out",
        "rounded-2xl border backdrop-blur-2xl",
        // Conditional Styling based on Selection
        selected 
          ? "bg-white border-accent/60 shadow-[0_0_30px_-5px_var(--color-accent)] scale-105 z-50" 
          : "bg-white/80 border-gray-200 shadow-lg hover:border-gray-300 hover:bg-white"
      )}
    >
      {/* Handles: Hidden by default, reveal on group hover. 
        This cleans up the UI significantly.
      */}
      <Handle 
        type="target" position={Position.Top} 
        className="!w-3 !h-3 !bg-accent !border-2 !border-white !-top-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
      />
      <Handle 
        type="source" position={Position.Bottom} 
        className="!w-3 !h-3 !bg-accent !border-2 !border-white !-bottom-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
      />

      <div className="p-4 flex items-center gap-4">
        {/* Avatar Section */}
        <div className="relative shrink-0">
          <div className={cn(
            "w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center",
            selected ? "border-accent" : "border-gray-300 group-hover:border-gray-400"
          )}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={data.label} className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-gray-400" />
            )}
          </div>
          {/* Role Badge (Optional) */}
          {data.role === 'root' && (
            <div className="absolute -top-1 -right-1 bg-accent text-black rounded-full p-0.5 border border-[#0d1117]">
               <Crown className="w-2 h-2" />
            </div>
          )}
        </div>

        {/* Text Details */}
        <div className="flex flex-col min-w-0">
          <h3 className={cn(
            "font-semibold text-sm truncate leading-tight transition-colors",
            selected ? "text-gray-900" : "text-gray-700"
          )}>
            {data.label}
          </h3>
          
          <span className="text-xs text-accent/80 font-medium truncate mb-0.5">
            {data.role || 'Relative'}
          </span>

          {data.birthDate && (
            <span className="text-[10px] text-gray-500 font-mono tracking-wide">
              {data.birthDate.split('-')[0]}
            </span>
          )}
        </div>
      </div>
      
      {/* Location Footer (Only if location exists) */}
      {data.birthPlace && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center gap-1.5 rounded-b-2xl">
          <MapPin className="w-3 h-3 text-gray-500" />
          <span className="text-[10px] text-gray-600 truncate max-w-full">
            {data.birthPlace}
          </span>
        </div>
      )}
    </div>
  );
};

export default memo(FamilyNode);