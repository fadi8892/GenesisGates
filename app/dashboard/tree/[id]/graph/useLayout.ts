import { useEffect, useRef, useState } from 'react';

export function useLayout(
  nodes: any[],
  edges: any[],
  mode: string = 'vertical',
  rootId?: string | null
) {
  // Store both nodes and the line geometry
  const [result, setResult] = useState<{ nodes: any[], geometry: any[] }>({ nodes: [], geometry: [] });
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Spin up the worker
    workerRef.current = new Worker(new URL('./layout.worker.ts', import.meta.url));
    
    // Listen for results
    workerRef.current.onmessage = (event) => {
      // Expecting { nodes: [...], geometry: [...] }
      setResult(event.data);
    };

    return () => { workerRef.current?.terminate(); };
  }, []);

  useEffect(() => {
    if (workerRef.current && nodes.length > 0) {
      // Send data to worker
      workerRef.current.postMessage({
        nodes: nodes.map(n => ({ id: n.id, ...n })), 
        edges,
        mode,
        rootId: rootId ?? null,
      });
    }
  }, [nodes, edges, mode, rootId]);

  return result;
}
