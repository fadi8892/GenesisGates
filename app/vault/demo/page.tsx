import { redirect } from 'next/navigation';

export default function DemoRedirect() {
  // Redirect to a public read-only demo tree; we use a hard-coded id for demonstration.
  redirect('/vault/sample-tree?mode=read');
  return null;
}