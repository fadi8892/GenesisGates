// app/dashboard/tree/[id]/graph/camera.ts
import { useCallback, useRef, useState } from "react";

export type Camera = { x: number; y: number; z: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function useCamera() {
  const [cam, setCam] = useState<Camera>({ x: 0, y: 0, z: 1 });

  const isPanning = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // pan only when background grabbed
    if (e.button !== 0) return;
    isPanning.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current || !last.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setCam((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    isPanning.current = false;
    last.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
  e.preventDefault();

  // IMPORTANT: grab rect immediately (before setState)
  const targetEl = e.currentTarget as HTMLElement | null;
  if (!targetEl) return;

  const rect = targetEl.getBoundingClientRect();

  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;

  const delta = -e.deltaY;
  const zoomFactor = delta > 0 ? 1.08 : 0.92;

  setCam((prev) => {
    const nextZ = clamp(prev.z * zoomFactor, 0.35, 2.2);

    // Keep world point under cursor stable
    const wx = (cx - prev.x) / prev.z;
    const wy = (cy - prev.y) / prev.z;

    const nextX = cx - wx * nextZ;
    const nextY = cy - wy * nextZ;

    return { x: nextX, y: nextY, z: nextZ };
  });
}, []);


  const panToWorld = useCallback((wx: number, wy: number) => {
    setCam((prev) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const targetX = cx - wx * prev.z;
      const targetY = cy - wy * prev.z;

      // one-step easing (fast + smooth)
      return {
        ...prev,
        x: prev.x + (targetX - prev.x) * 0.25,
        y: prev.y + (targetY - prev.y) * 0.25,
      };
    });
  }, []);

  return { cam, setCam, onPointerDown, onPointerMove, onPointerUp, onWheel, panToWorld };
}
