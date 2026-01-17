import { notFound } from 'next/navigation';
import TreeWorkspace from '@/components/TreeWorkspace';

interface PageProps {
  params: { treeId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function TreePage({ params, searchParams }: PageProps) {
  const { treeId } = params;
  if (!treeId) {
    return notFound();
  }
  // Determine readOnly mode based on query param; default to true if "r" parameter present.
  const readOnly = searchParams?.mode === 'read';
  return (
    <main className="flex h-screen flex-col">
      <div className="flex-1">
        <TreeWorkspace treeId={treeId} readOnly={readOnly} />
      </div>
    </main>
  );
}