// app/trees/page.tsx
export const dynamic = 'force-dynamic'; // don’t pre-render
export const revalidate = 0;

import TreesClient from '../../components/trees/TreesClient';

export default function TreesPage() {
  return <TreesClient />;
}
