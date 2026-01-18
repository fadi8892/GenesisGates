"use client";
import React, { useEffect, useRef } from "react";

type Cam = { x: number; y: number; z: number };
type Size = { w: number; h: number };

type Line = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type?: "bezier" | "step" | "line";
};

type Props = {
  geometry: Line[];
  cam: Cam;
  size: Size;
  highlightSet?: Set<string> | null;
  lineStyle?: {
    baseWidth: number;
    highlightWidth: number;
    minWidth: number;
    color: string;
    highlightColor: string;
    dimColor: string;
    glow: boolean;
  };
};

export function CanvasEdges({ geometry, cam, size, highlightSet, lineStyle }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const safeGeometry: Line[] = Array.isArray(geometry) ? geometry : [];
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const width = Math.floor(size.w);
    const height = Math.floor(size.h);

    // Resize only when needed
    const targetW = Math.max(1, Math.floor(width * dpr));
    const targetH = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    // Reset + scale for DPR
    // (resetTransform not supported in some older canvases; keep safe)
    if (typeof (ctx as any).resetTransform === "function") (ctx as any).resetTransform();
    else ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#F5F5F7";
    ctx.fillRect(0, 0, width, height);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const hasHighlight = !!highlightSet && highlightSet.size > 0;

    // Culling margin (in screen space)
    const margin = 100;

    // Helper: add a line path to current ctx path
    const addPath = (line: Line) => {
      const x1 = line.x1 * cam.z + cam.x;
      const y1 = line.y1 * cam.z + cam.y;
      const x2 = line.x2 * cam.z + cam.x;
      const y2 = line.y2 * cam.z + cam.y;

      // Frustum culling
      if (
        (x1 < -margin && x2 < -margin) ||
        (x1 > width + margin && x2 > width + margin) ||
        (y1 < -margin && y2 < -margin) ||
        (y1 > height + margin && y2 > height + margin)
      ) {
        return;
      }

      ctx.moveTo(x1, y1);

      if (line.type === "bezier") {
        const midX = (x1 + x2) / 2;
        ctx.bezierCurveTo(midX, y1, midX, y2, x2, y2);
      } else if (line.type === "step") {
        const midY = (y1 + y2) / 2;
        ctx.lineTo(x1, midY);
        ctx.lineTo(x2, midY);
        ctx.lineTo(x2, y2);
      } else {
        ctx.lineTo(x2, y2);
      }
    };

    const baseWidth = lineStyle?.baseWidth ?? 2.2;
    const highlightWidth = lineStyle?.highlightWidth ?? 3.2;
    const minWidth = lineStyle?.minWidth ?? 1.6;
    const dimColor = lineStyle?.dimColor ?? "#E5E5EA";
    const baseColor = lineStyle?.color ?? "#A1A1AA";
    const highlightColor = lineStyle?.highlightColor ?? "#70707A";

    const scaledWidth = (width: number) =>
      Math.max(minWidth, width * Math.max(0.35, cam.z));

    if (lineStyle?.glow) {
      ctx.shadowColor = "rgba(59, 130, 246, 0.18)";
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
    }

    // Pass 1: draw DIMMED (everything not highlighted) OR all lines if no highlighting
    ctx.beginPath();

    if (hasHighlight) {
      for (const line of safeGeometry) {
        if (!highlightSet!.has(line.id)) addPath(line);
      }
      ctx.strokeStyle = dimColor;
      ctx.lineWidth = scaledWidth(baseWidth * 0.7);
      ctx.stroke();

      // Pass 2: draw HIGHLIGHTED
      ctx.beginPath();
      for (const line of safeGeometry) {
        if (highlightSet!.has(line.id)) addPath(line);
      }
      ctx.strokeStyle = highlightColor;
      ctx.lineWidth = scaledWidth(highlightWidth);
      ctx.stroke();
    } else {
      for (const line of safeGeometry) addPath(line);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = scaledWidth(baseWidth);
      ctx.stroke();
    }
  }, [geometry, cam.x, cam.y, cam.z, size.w, size.h, dpr, highlightSet, lineStyle]);

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />;
}
