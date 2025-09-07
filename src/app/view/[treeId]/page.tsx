import ViewerClient from './viewer-client';

export const dynamic = 'force-dynamic';

export default function ViewTreePage({ params }: { params: { treeId: string } }) {
  return <ViewerClient treeId={params.treeId} />;
}