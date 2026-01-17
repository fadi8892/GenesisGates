"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import * as f3 from "@/lib/family-chart/src/index"; // We will place the library here
import "@/lib/family-chart/src/styles/family-chart.css"; // Import styles
import type { Datum } from "@/lib/family-chart/src/types/data";

export default function TreeClient({ initialData }: { initialData: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [store, setStore] = useState<any>(null);
  const [chart, setChart] = useState<any>(null);

  useEffect(() => {
    if (!containerRef.current || !initialData) return;

    // 1. Transform Data to Family-Chart format if needed
    // Family-Chart expects: { id, data: { gender, ... }, rels: { parents, spouses, children } }
    const formattedData = initialData.nodes.map((n: any) => ({
      id: n.id,
      data: {
        gender: n.data.gender || "M", // Required by library
        "first name": n.data.label?.split(" ")[0] || "Unknown",
        "last name": n.data.label?.split(" ").slice(1).join(" ") || "",
        birthday: n.data.born_year || "",
        avatar: n.data.avatar || "",
        ...n.data
      },
      rels: {
        parents: findParents(n.id, initialData.edges),
        children: findChildren(n.id, initialData.edges),
        spouses: findSpouses(n.id, initialData.edges)
      }
    }));

    // 2. Initialize Chart
    const f3Chart = f3.createChart(containerRef.current, formattedData)
      .setTransitionTime(1000)
      .setCardXSpacing(250)
      .setCardYSpacing(150)
      .setOrientationVertical(); // Or .setOrientationHorizontal()

    // 3. Configure Cards (HTML)
    const f3Card = f3Chart.setCardHtml()
      .setCardDisplay([
        ["first name", "last name"],
        ["birthday"]
      ]);

    // 4. Initial Render
    f3Chart.updateTree({ initial: true });

    // Save references
    setChart(f3Chart);
    setStore(f3Chart.store);

  }, [initialData]);

  // Helpers to map your Edge format to Family-Chart's 'rels' format
  const findParents = (id: string, edges: any[]) => 
    edges.filter(e => e.target === id).map(e => e.source);

  const findChildren = (id: string, edges: any[]) => 
    edges.filter(e => e.source === id).map(e => e.target);

  const findSpouses = (id: string, edges: any[]) => {
    // In strict graph terms, spouses share children. 
    // This logic might need to be adjusted based on your specific edge types.
    const children = findChildren(id, edges);
    const spouses = new Set<string>();
    children.forEach(childId => {
      const parents = findParents(childId, edges);
      parents.forEach(p => {
        if (p !== id) spouses.add(p);
      });
    });
    return Array.from(spouses);
  };

  return (
    <div 
      id="FamilyChart" 
      ref={containerRef} 
      className="f3" 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#333', 
        color: '#fff' 
      }} 
    />
  );
}