// src/components/BillingGuard.tsx
'use client';
import { useEffect, useState } from 'react';

export function useUsage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch('/api/usage').then(r=>r.json()).then(setData).catch(()=>{}); }, []);
  return data;
}

export default function BillingGuard({
  requireTreesUnder,
  requireBytesUnder,
  fallback,
  children,
}: {
  requireTreesUnder?: number;
  requireBytesUnder?: number;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const u = useUsage();
  if (!u) return null;
  const overTrees = typeof requireTreesUnder === 'number' && u.plan === 'FREE' && u.treeCount >= requireTreesUnder;
  const overBytes = typeof requireBytesUnder === 'number' && u.plan === 'FREE' && u.totalBytes >= requireBytesUnder;
  if (overTrees || overBytes) return <>{fallback ?? <div className="text-sm text-red-600">Upgrade required.</div>}</>;
  return <>{children}</>;
}
