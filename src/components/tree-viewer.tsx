'use client';
import TreeClient, { type State } from '@/app/tree/[id]/tree-client';

export default function TreeViewer({ initialState, treeId }: { initialState: State; treeId: string }) {
  return <TreeClient treeId={treeId} initialState={initialState} readOnly />;
}