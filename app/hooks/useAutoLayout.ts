import { useCallback } from 'react';
import dagre from 'dagre';
import { Node, Edge, Position, useReactFlow } from 'reactflow';

// The size of your FamilyNode (width x height)
const NODE_WIDTH = 240;
const NODE_HEIGHT = 160;

export default function useAutoLayout() {
  const { setNodes, setEdges } = useReactFlow();

  const onLayout = useCallback(
    (nodes: Node[], edges: Edge[], direction = 'TB') => {
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));

      const isHorizontal = direction === 'LR';
      dagreGraph.setGraph({ rankdir: direction });

      nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
      });

      edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      const layoutNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        
        return {
          ...node,
          targetPosition: isHorizontal ? Position.Left : Position.Top,
          sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
          // We shift position so React Flow centers it correctly
          position: {
            x: nodeWithPosition.x - NODE_WIDTH / 2,
            y: nodeWithPosition.y - NODE_HEIGHT / 2,
          },
        };
      });

      setNodes(layoutNodes);
      setEdges(edges);
    },
    [setNodes, setEdges]
  );

  return { onLayout };
}