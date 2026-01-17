import React, { memo } from 'react';
import { EdgeProps, getSmoothStepPath } from 'reactflow';

const SmartEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16, // Rounded corners like a subway map
  });

  // Dynamic styling based on state (Spotlight, Ancestor, Descendant)
  const isHighlight = data?.isHighlight;
  const isAncestor = data?.type === 'ancestor';
  const isDescendant = data?.type === 'descendant';

  // Base colors
  let stroke = '#333';
  let strokeWidth = 2;
  let opacity = 0.3; // Default dim

  if (isHighlight) {
    opacity = 1;
    strokeWidth = 3;
    if (isAncestor) stroke = '#fbbf24'; // Gold for Ancestors
    else if (isDescendant) stroke = '#3b82f6'; // Blue for Descendants
    else stroke = '#fff'; // White for immediate connections
  }

  return (
    <>
      {/* Glow Effect Layer (Behind) */}
      {isHighlight && (
        <path
          id={`${id}-glow`}
          style={{ ...style, stroke, strokeWidth: strokeWidth * 4, opacity: 0.15 }}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={markerEnd}
        />
      )}

      {/* Main Path Layer */}
      <path
        id={id}
        style={{ ...style, stroke, strokeWidth, opacity, transition: 'all 0.4s ease' }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
    </>
  );
});

SmartEdge.displayName = 'SmartEdge';

export default SmartEdge;