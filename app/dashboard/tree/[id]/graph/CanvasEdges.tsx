"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  geometry: any[]; 
  cam: { x: number; y: number; z: number };
  size: { w: number; h: number };
  highlightSet?: Set<string> | null;
};

export function CanvasEdges({ geometry, cam, size, highlightSet }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    
    // Safety check: ensure geometry is an array
    const safeGeometry = Array.isArray(geometry) ? geometry : [];

    const ctx = canvas.getContext("2d", { alpha: false }); 
    if (!ctx) return;

    // 1. Setup Canvas
    // Use Math.floor to avoid subpixel blurring
    const width = Math.floor(size.w);
    const height = Math.floor(size.h);
    
    // Only resize if dimensions changed to avoid flickering
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    
    ctx.resetTransform(); // Reset before scaling
    ctx.scale(dpr, dpr);
    
    // Fill Background
    ctx.fillStyle = "#F5F5F7"; 
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Lines
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";
    
    const isHighlighting = highlightSet && highlightSet.size > 0;

    // Batch drawing
    ctx.beginPath();
    
    if (isHighlighting) {
       ctx.strokeStyle = "#E5E5EA"; // Dimmed color
       ctx.lineWidth = 1 * cam.z;
    } else {
       ctx.strokeStyle = "#A1A1AA"; // Normal color
       ctx.lineWidth = 2 * cam.z;
    }
    
    // Iterate and draw
    safeGeometry.forEach(line => {
       const x1 = line.x1 * cam.z + cam.x;
       const y1 = line.y1 * cam.z + cam.y;
       const x2 = line.x2 * cam.z + cam.x;
       const y2 = line.y2 * cam.z + cam.y;

       // Simple Frustum Culling (Performance)
       if (
         (x1 < -50 && x2 < -50) || 
         (x1 > width + 50 && x2 > width + 50) ||
         (y1 < -50 && y2 < -50) || 
         (y1 > height + 50 && y2 > height + 50)
       ) return;

       ctx.moveTo(x1, y1);
       ctx.lineTo(x2, y2);
    });
    
    ctx.stroke();

  // FIX: Explicitly destructured primitive dependencies to prevent reference issues
  // geometry is passed as a single reference, NOT spread
  }, [geometry, cam.x, cam.y, cam.z, size.w, size.h, dpr, highlightSet]);

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />;
}