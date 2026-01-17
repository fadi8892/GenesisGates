"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  geometry: any[]; // The lines from the worker
  cam: { x: number; y: number; z: number };
  size: { w: number; h: number };
};

export function CanvasEdges({ geometry, cam, size }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !geometry) return;
    const ctx = canvas.getContext("2d", { alpha: false }); 
    if (!ctx) return;

    // 1. Setup Canvas
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    ctx.scale(dpr, dpr);
    
    // Fill Background
    ctx.fillStyle = "#F5F5F7"; 
    ctx.fillRect(0, 0, size.w, size.h);

    // 2. Draw Lines
    ctx.lineCap = "square"; // Sharp corners for that "diagram" feel
    ctx.lineJoin = "miter";
    
    ctx.beginPath();
    ctx.strokeStyle = "#A1A1AA"; // Neutral Gray
    ctx.lineWidth = 2 * cam.z;

    geometry.forEach(line => {
       // Project World Coordinates -> Screen Coordinates
       const x1 = line.x1 * cam.z + cam.x;
       const y1 = line.y1 * cam.z + cam.y;
       const x2 = line.x2 * cam.z + cam.x;
       const y2 = line.y2 * cam.z + cam.y;

       // Performance Optimization: Culling
       // Don't draw if the line is completely off the screen
       if (
         (x1 < -50 && x2 < -50) || 
         (x1 > size.w + 50 && x2 > size.w + 50) ||
         (y1 < -50 && y2 < -50) || 
         (y1 > size.h + 50 && y2 > size.h + 50)
       ) return;

       ctx.moveTo(x1, y1);
       ctx.lineTo(x2, y2);
    });

    ctx.stroke();

  }, [geometry, cam, size, dpr]);

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />;
}